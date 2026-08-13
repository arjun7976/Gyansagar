import { connectToDatabase } from "./mongodb";
import User from "../models/User";
import Test from "../models/Test";
import Question from "../models/Question";
import Result from "../models/Result";
export async function getDashboardStatistics() { await connectToDatabase(); const [students, tests, questions, attempts] = await Promise.all([User.countDocuments({ role: "student" }), Test.countDocuments(), Question.countDocuments(), Result.countDocuments()]); return { students, tests, questions, attempts }; }