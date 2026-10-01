
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";
import { getStripeClient } from "@/lib/stripe/server";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";


export async function POST(request: Request) {

  try {

    if (!(await hasFunctionHourAdminAccess())) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }


    const user = await currentUser();

    const body = await request.json();

    const { requestId, stripeAccountId, amount } = body;


    if (!requestId || !stripeAccountId || !amount) {
      return NextResponse.json(
        { error: "Missing payout information" },
        { status: 400 }
      );
    }


    const stripe = getStripeClient();


    const transfer =
      await stripe.transfers.create(
        {
          amount: Math.round(amount * 100),
          currency: "usd",
          destination: stripeAccountId,
          transfer_group:
            `functionhour-admin-payout-${requestId}`,
          metadata: {
            payoutRequestId: requestId,
          },
        },
        {
          idempotencyKey:
            `functionhour-admin-payout-${requestId}`,
        }
      );


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
        stripeTransferId: transfer.id,
      }
    );


    return NextResponse.json({
      success:true,
      transferId:transfer.id
    });


  } catch(error){

    console.error(error);

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

