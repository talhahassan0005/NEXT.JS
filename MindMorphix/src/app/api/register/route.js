import dbConnect from "@/utils/dbConnect";
import User from "@/models/User";
import bcrypt from "bcrypt";

// Use dbConnect inside the function
export async function POST(request) {
  try {
    await dbConnect();  // ✅ Ensure DB is connected

    const { username, email, password } = await request.json();

    // ✅ Input validation
    if (!username || !email || !password) {
      return new Response(JSON.stringify({
        message: "All fields are required",
      }), { status: 400 });
    }

    // ✅ Basic email format check
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        message: "Invalid email format",
      }), { status: 400 });
    }

    // ✅ Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return new Response(JSON.stringify({
        message: "User already exists",
      }), { status: 409 });
    }

    // ✅ Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ✅ Create user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    return new Response(JSON.stringify({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    }), { status: 201 });

  } catch (error) {
    console.error("❌ Registration error:", error);
    return new Response(JSON.stringify({
      message: "Internal server error",
    }), { status: 500 });
  }
}
