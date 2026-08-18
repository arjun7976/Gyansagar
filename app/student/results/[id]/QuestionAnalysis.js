"use client";

import { useState } from "react";

export default function QuestionAnalysis({ questions, attempt }) {
  const [filter, setFilter] = useState("All");

  const filteredQuestions = questions.filter((q) => {
    if (filter === "All") return true;
    
    const userAnswer = attempt.answers.find(a => a.questionId.toString() === q._id.toString())?.answer;
    let status = "Unattempted";
    
    if (userAnswer) {
      if (userAnswer === q.correctAnswer) {
        status = "Correct";
      } else {
        status = "Wrong";
      }
    }
    
    return status === filter;
  });

  return (
    <div className="bg-white shadow rounded-2xl overflow-hidden border border-gray-100">
      <div className="px-8 py-6 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800">Question-wise Analysis</h2>
        
        {/* Filters */}
        <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm overflow-x-auto max-w-full">
          {["All", "Correct", "Wrong", "Unattempted"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${
                filter === f
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      
      <div className="divide-y divide-gray-100">
        {filteredQuestions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-medium">
            No questions found for this filter.
          </div>
        ) : (
          filteredQuestions.map((q, idx) => {
            // Find original index for displaying Question number correctly
            const originalIdx = questions.findIndex(origQ => origQ._id.toString() === q._id.toString());
            const userAnswer = attempt.answers.find(a => a.questionId.toString() === q._id.toString())?.answer;
            let status = "Unattempted";
            let marksGained = 0;
            let badgeClass = "bg-gray-100 text-gray-600";
            
            if (!userAnswer) {
              status = "Unattempted";
              marksGained = 0;
            } else if (userAnswer === q.correctAnswer) {
              status = "Correct";
              marksGained = q.marks;
              badgeClass = "bg-green-100 text-green-700 border border-green-200";
            } else {
              status = "Wrong";
              marksGained = -attempt.testId.negativeMarks;
              badgeClass = "bg-red-100 text-red-700 border border-red-200";
            }

            return (
              <div key={q._id.toString()} className="p-8 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Question {originalIdx + 1}</h3>
                  <div className="flex space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badgeClass}`}>
                      {status}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">
                      Marks: {marksGained > 0 ? `+${marksGained}` : marksGained}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-700 text-lg mb-6 whitespace-pre-wrap">{q.questionText}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="block text-gray-500 font-semibold mb-1 uppercase text-xs tracking-wider">Your Answer</span>
                    <span className="font-medium text-gray-900">{userAnswer ? `${userAnswer}: ${q.options[userAnswer]}` : "Not Attempted"}</span>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <span className="block text-green-700 font-semibold mb-1 uppercase text-xs tracking-wider">Correct Answer</span>
                    <span className="font-medium text-green-900">{q.correctAnswer}: {q.options[q.correctAnswer]}</span>
                  </div>
                </div>
                
                {q.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 text-sm">
                    <span className="font-bold block mb-1">Explanation:</span>
                    <span className="whitespace-pre-wrap">{q.explanation}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
