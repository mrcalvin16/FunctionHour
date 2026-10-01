import { NextResponse } from "next/server";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { getStripeClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";


export async function POST(request: Request) {
  try {

    const isAdmin = await hasFunctionHourAdminAccess();

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }


    const body = await request.json();

    const {
      requestId,
      stripeAccountId,
      amount
    } = body;


    if (!requestId || !stripeAccountId || !amount) {
      return NextResponse.json(
        { error: "Missing payout information" },
        { status: 400 }
      );
    }


    const transfer = await getStripeClient()
      .transfers
      .create({
        amount: Math.round(amount * 100),
        currency: "usd",
        destination: stripeAccountId,
        transfer_group: `functionhour-admin-approved-${requestId}`,
        metadata: {
          payoutRequestId: requestId,
          approvedBy: "Function Hour Admin"
        }
      });


    const secret =
      process.env.STRIPE_WEBHOOK_SHARED_SECRET;


    if (!secret) {
      throw new Error("Missing server secret");
    }


    const convex = getConvexClient();


    await convex.mutation(
      api.payouts.markOrganizerPayoutTransferred,
      {
        serverSecret: secret,
        requestId,
        stripeTransferId: transfer.id
      }
    );


    return NextResponse.json({
      success:true,
      transferId:transfer.id
    });


  } catch(error){

    console.error(
      "Admin payout approval failed",
      error
    );


    return NextResponse.json(
      {
        error:"Unable to approve payout"
      },
      {
        status:500
      }
    );
  }
}
