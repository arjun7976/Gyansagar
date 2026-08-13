import { notFound } from "next/navigation";
import Test from "../../../../../../models/Test";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import TestForm from "../../../../../../components/TestForm";
export default async function EditTestPage({ params }) { const { id } = await params; await connectToDatabase(); const test = await Test.findById(id).lean(); if (!test) notFound(); return <TestForm initialData={JSON.parse(JSON.stringify(test))} />; }