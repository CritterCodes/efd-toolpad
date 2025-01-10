import { db } from "../../../../lib/database";
import { v4 as uuidv4 } from "uuid";

/**
 * UserController Class with Static Arrow Functions
 */
export default class UserController {
    /**
     * ✅ Create User
     */
    static createUser = async (req) => {
        try {
            // Parse the request body
            const body = await req.json();
            const { firstName, lastName, email, phone, address, picture } = body;

            console.log("Request Body:", body);

            // Validate required fields
            if (!firstName || !lastName || !email) {
                return new Response(
                    JSON.stringify({ error: "First name, last name, and email are required." }),
                    { status: 400 }
                );
            }

            const dbInstance = await db.connect();
            const usersCollection = dbInstance.collection("users");

            // Check if the user already exists
            const userExists = await usersCollection.findOne({ email });
            if (userExists) {
                return new Response(
                    JSON.stringify({ error: "User already exists." }),
                    { status: 400 }
                );
            }

            const newUser = {
                userID: `user-${uuidv4().slice(-8)}`,
                firstName,
                lastName,
                email,
                phone,
                address,
                picture: picture || null,
                createdAt: new Date(),
                verified: false, // Unverified by default
            };

            // Insert the new user into the database
            await usersCollection.insertOne(newUser);

            return new Response(
                JSON.stringify({ message: "User created successfully", user: newUser }),
                { status: 201 }
            );
        } catch (error) {
            console.error("Error creating user:", error);
            return new Response(
                JSON.stringify({ error: "Error creating user", details: error.message }),
                { status: 500 }
            );
        }
    };

    /**
     * ✅ Get Users
     */
    static getUsers = async (req) => {
        try {
            // Extract query parameters from the request URL
            const { searchParams } = new URL(req.url);
            const query = searchParams.get("query");

            if (!query) {
                return new Response(
                    JSON.stringify({ error: "Query parameter is required." }),
                    { status: 400 }
                );
            }

            const dbInstance = await db.connect();
            const users = await dbInstance.collection("users").find({
                $or: [
                    { firstName: { $regex: query, $options: "i" } },
                    { lastName: { $regex: query, $options: "i" } },
                    { userID: { $regex: query, $options: "i" } },
                ],
            }).toArray();

            return new Response(JSON.stringify(users), { status: 200 });
        } catch (error) {
            console.error("Error fetching users:", error);
            return new Response(
                JSON.stringify({ error: "Failed to fetch users." }),
                { status: 500 }
            );
        }
    };
}
