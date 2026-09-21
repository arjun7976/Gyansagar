/**
 * GyanSagar OMR System - Production Answer Key Evaluation Engine
 * Performs deterministic question-wise answer key matching, configurable marking calculation,
 * set-wise key lookup, and comprehensive result aggregation.
 */

export class AnswerKeyNotFoundError extends Error {
  constructor(message = "Answer key not found for this examination and set.") {
    super(message);
    this.name = "AnswerKeyNotFoundError";
    this.code = "ANSWER_KEY_NOT_FOUND";
  }
}

/**
 * Normalizes an answer key input into a Map of questionNumber -> correctAnswer.
 * @param {Array|Object} answerKeyInput - Raw answer key list or map
 * @returns {Map<number, string>} Map of questionNumber -> answer ("A"|"B"|"C"|"D"|"BLANK")
 */
export function buildAnswerKeyMap(answerKeyInput) {
  const map = new Map();
  if (!answerKeyInput) return map;

  if (Array.isArray(answerKeyInput)) {
    answerKeyInput.forEach((item) => {
      if (!item) return;
      const qNum = Number(item.questionOrder ?? item.question ?? item.qNum);
      const ans = String(item.answer ?? item.correctAnswer ?? "").toUpperCase().trim();
      if (Number.isInteger(qNum) && qNum > 0 && ans) {
        map.set(qNum, ans);
      }
    });
  } else if (typeof answerKeyInput === "object") {
    Object.keys(answerKeyInput).forEach((key) => {
      const qNum = Number(key);
      const ans = String(answerKeyInput[key] || "").toUpperCase().trim();
      if (Number.isInteger(qNum) && qNum > 0 && ans) {
        map.set(qNum, ans);
      }
    });
  }

  return map;
}

/**
 * Evaluates OMR scan detections against a saved answer key.
 * 
 * @param {Array|Object} detections - Scanner detected answers array or map
 * @param {Array|Object} answerKeyInput - Saved answer key list or map
 * @param {Object} options - Evaluation options: set, markingConfig
 * @returns {Object} Comprehensive evaluation result
 */
export function evaluateOmrScanResults(detections, answerKeyInput, options = {}) {
  const {
    set = "A",
    markingConfig = {}
  } = options;

  const correctMarks = Number(markingConfig.correctMarks ?? 1);
  const wrongMarks = Number(markingConfig.wrongMarks ?? markingConfig.negativeMarks ?? 0);
  const blankMarks = Number(markingConfig.blankMarks ?? 0);
  const multipleMarks = Number(markingConfig.multipleMarks ?? wrongMarks ?? 0);

  // 1. Build Answer Key Map
  const keyMap = buildAnswerKeyMap(answerKeyInput);

  if (keyMap.size === 0) {
    return {
      success: false,
      error_code: "ANSWER_KEY_NOT_FOUND",
      message: `Answer key not found for set "${set}".`
    };
  }

  // 2. Normalize Detections Map: questionNumber -> detection object
  const detMap = new Map();
  if (Array.isArray(detections)) {
    detections.forEach((d) => {
      if (d && d.question != null) {
        detMap.set(Number(d.question), d);
      }
    });
  } else if (detections && typeof detections === "object") {
    Object.keys(detections).forEach((k) => {
      const qNum = Number(k);
      const item = detections[k];
      if (Number.isInteger(qNum) && item) {
        detMap.set(qNum, {
          question: qNum,
          selected: item.selected ?? item.answer ?? null,
          status: item.status ?? (item.answer ? "answered" : "blank"),
          confidence: item.confidence ?? 1.0
        });
      }
    });
  }

  // Determine question range (e.g. 1..150, 151..300, or matching keyMap range)
  const questionNumbers = Array.from(keyMap.keys()).sort((a, b) => a - b);
  const minQ = questionNumbers[0] || 1;
  const maxQ = questionNumbers[questionNumbers.length - 1] || 150;

  let totalQuestions = 0;
  let attempted = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;
  let multipleCount = 0;
  let uncertainCount = 0;
  let totalMarksObtained = 0;

  const questionResults = [];

  console.log(`\n========== OMR ANSWER KEY EVALUATION START (Set ${set}) ==========`);

  for (let q = minQ; q <= maxQ; q++) {
    const correctAnswer = keyMap.get(q) || null;
    const detItem = detMap.get(q) || { question: q, selected: null, status: "blank", confidence: 1.0 };
    
    const detectedAnswer = detItem.selected ?? detItem.answer ?? null;
    const status = detItem.status || (detectedAnswer ? "answered" : "blank");

    let result = "blank";
    let qMarks = 0;

    if (!correctAnswer) {
      // Question not in key
      result = "uncertain";
      qMarks = 0;
      uncertainCount++;
    } else if (status === "blank") {
      result = "blank";
      qMarks = blankMarks;
      blankCount++;
    } else if (status === "multiple") {
      result = "multiple";
      qMarks = multipleMarks;
      multipleCount++;
      attempted++;
    } else if (status === "uncertain") {
      result = "uncertain";
      qMarks = 0;
      uncertainCount++;
    } else {
      attempted++;
      if (detectedAnswer === correctAnswer) {
        result = "correct";
        qMarks = correctMarks;
        correctCount++;
      } else {
        result = "wrong";
        qMarks = wrongMarks;
        wrongCount++;
      }
    }

    totalQuestions++;
    totalMarksObtained += qMarks;

    console.log(
      `Q${q}: detected = ${detectedAnswer || "null"} | answerKey = ${correctAnswer || "NONE"} | status = ${status} | result = ${result.toUpperCase()} | marks = ${qMarks}`
    );

    questionResults.push({
      question: q,
      detected: detectedAnswer,
      correctAnswer: correctAnswer === "BLANK" ? null : correctAnswer,
      status,
      result,
      marks: Number(qMarks.toFixed(2))
    });
  }

  const maxPossibleMarks = totalQuestions * correctMarks;
  const percentage = maxPossibleMarks > 0
    ? Number(((totalMarksObtained / maxPossibleMarks) * 100).toFixed(2))
    : 0;

  console.log(
    `========== OMR EVALUATION SUMMARY: Score ${totalMarksObtained}/${maxPossibleMarks} (${percentage}%) | Correct: ${correctCount}, Wrong: ${wrongCount}, Blank: ${blankCount}, Multiple: ${multipleCount} ==========\n`
  );

  return {
    success: true,
    set,
    totalQuestions,
    attempted,
    correct: correctCount,
    wrong: wrongCount,
    blank: blankCount,
    multiple: multipleCount,
    uncertain: uncertainCount,
    marks: Number(totalMarksObtained.toFixed(2)),
    maxMarks: Number(maxPossibleMarks.toFixed(2)),
    percentage,
    questionResults
  };
}
