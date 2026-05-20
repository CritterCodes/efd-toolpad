// Registration is handled by efd-shop. There is no self-registration on the admin.
import { NextResponse } from "next/server";

export async function POST() {
    return NextResponse.json(
        { error: "Registration is not available here. Please create your account at shop.engelfinedesign.com." },
        { status: 403 }
    );
}
