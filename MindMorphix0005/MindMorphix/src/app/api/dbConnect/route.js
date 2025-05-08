import dbConnect from "@/utils/dbConnect"; // Adjust if your path is different

export async function GET() {
  try {
    await dbConnect(); // Connect to MongoDB

    return new Response(JSON.stringify({ message: "Database connected successfully!" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Database connection error:", error);
    return new Response(JSON.stringify({ message: "Database connection failed.", error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
