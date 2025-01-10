// src/app/api/users/route.js
import UserController from "./controller";

export const GET = async (req) => UserController.getUsers(req);

export const POST = async (req) => UserController.createUser(req);
