import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import Test from "../../../../../models/Test";
import Question from "../../../../../models/Question";
import TestQuestion from "../../../../../models/TestQuestion";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { isObjectId, requireAdmin } from "../../../../../lib/admin";
const columns = ["testId", "questionText", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "explanation", "marks", "difficulty", "subject"];
function validate(row, index, testIds) { const value = (key) => String(row[key] ?? "").trim(); const errors = []; const tId = value("testId"); if (tId && (!isObjectId(tId) || !testIds.has(tId))) errors.push("Test ID not found"); if (!value("questionText")) errors.push("Question is empty"); ["optionA", "optionB", "optionC", "optionD"].forEach((key) => { if (!value(key)) errors.push(`${key} is required`); }); if (!/[ABCD]/.test(value("correctAnswer").toUpperCase()) || value("correctAnswer").length !== 1) errors.push("Correct answer is invalid"); if (!Number.isFinite(Number(value("marks"))) || Number(value("marks")) <= 0) errors.push("Marks must be positive"); if (!["Easy", "Medium", "Hard"].includes(value("difficulty"))) errors.push("Difficulty is invalid"); if (!value("subject")) errors.push("Subject is required"); const data = { questionText: value("questionText"), options: { A: value("optionA"), B: value("optionB"), C: value("optionC"), D: value("optionD") }, correctAnswer: value("correctAnswer").toUpperCase(), explanation: value("explanation"), marks: Number(value("marks")), difficulty: value("difficulty"), subject: value("subject") }; if (tId) data.testId = tId; return { row: index + 2, errors, data }; }
export async function POST(request) { try { if (!await requireAdmin()) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }); const form = await request.formData(); const file = form.get("file"), action = form.get("action") || "preview", formTestId = form.get("testId"); if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024) return NextResponse.json({ success: false, message: "Upload an XLSX or CSV file up to 5 MB" }, { status: 400 }); if (!/\.(xlsx|csv)$/i.test(file.name)) return NextResponse.json({ success: false, message: "Only .xlsx and .csv files are supported" }, { status: 400 }); const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }); if (!rows.length) return NextResponse.json({ success: false, message: "The uploaded file has no data rows" }, { status: 400 }); if (rows.length > 1000) return NextResponse.json({ success: false, message: "Maximum 1000 rows per import" }, { status: 400 }); await connectToDatabase(); 
const ids = [...new Set(rows.map((row) => String(row.testId ?? "").trim()).filter(isObjectId))]; 
if (formTestId && isObjectId(formTestId)) ids.push(formTestId);
const existing = await Test.find({ _id: { $in: ids } }).select("_id").lean(); 
const existingIds = new Set(existing.map((test) => test._id.toString()));
if (formTestId && !existingIds.has(formTestId)) return NextResponse.json({ success: false, message: "Selected Target Test not found" }, { status: 400 });
const validated = rows.map((row, index) => validate(row, index, existingIds)); const valid = validated.filter((item) => !item.errors.length); const errors = validated.filter((item) => item.errors.length).map((item) => ({ row: item.row, message: item.errors.join("; ") })); let importedRows = 0; 
if (action === "import" && valid.length) { 
  const insertedDocs = await Question.insertMany(valid.map((item) => {
    const data = item.data;
    if (formTestId) data.testId = formTestId;
    return data;
  }), { ordered: true }); 
  
  if (formTestId) {
    const maxOrderDoc = await TestQuestion.findOne({ testId: formTestId }).sort({ questionOrder: -1 }).select("questionOrder").lean();
    let nextOrder = (maxOrderDoc?.questionOrder ?? -1) + 1;
    const testQuestionDocs = insertedDocs.map(doc => ({ testId: formTestId, questionId: doc._id, questionOrder: nextOrder++ }));
    await TestQuestion.insertMany(testQuestionDocs);
  }
  importedRows = valid.length; 
} 
return NextResponse.json({ success: true, totalRows: rows.length, validRows: valid.length, invalidRows: errors.length, importedRows, errors, preview: valid.slice(0, 10).map((item) => item.data) }); } catch (error) { console.error("Question import failed:", error.message); return NextResponse.json({ success: false, message: "Unable to process import file" }, { status: 500 }); } }