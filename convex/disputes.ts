
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";


function assertServerSecret(secret:string){
  const expected =
    process.env.STRIPE_WEBHOOK_SHARED_SECRET;

  if(!expected || secret !== expected){
    throw new Error("Unauthorized");
  }
}


export const createOrUpdateStripeDispute = mutation({

  args:{
    serverSecret:v.string(),

    stripeDisputeId:v.string(),
    paymentIntentId:v.optional(v.string()),
    chargeId:v.optional(v.string()),

    amount:v.float64(),
    currency:v.string(),

    status:v.union(
      v.literal("warning"),
      v.literal("needs_response"),
      v.literal("under_review"),
      v.literal("won"),
      v.literal("lost"),
      v.literal("closed")
    ),

    reason:v.optional(v.string())
  },


  handler:async(ctx,args)=>{

    assertServerSecret(args.serverSecret);


    const existing =
      await ctx.db
      .query("stripeDisputes")
      .withIndex(
        "by_stripeDisputeId",
        q=>q.eq(
          "stripeDisputeId",
          args.stripeDisputeId
        )
      )
      .first();


    const now = Date.now();


    if(existing){

      await ctx.db.patch(
        existing._id,
        {
          status:args.status,
          reason:args.reason,
          updatedAt:now
        }
      );

      return existing._id;
    }


    return await ctx.db.insert(
      "stripeDisputes",
      {
        ...args,
        createdAt:now,
        updatedAt:now
      }
    );
  }

});


export const getStripeDisputes = query({

  args:{
    serverSecret:v.string()
  },


  handler:async(ctx,args)=>{

    assertServerSecret(args.serverSecret);

    return await ctx.db
      .query("stripeDisputes")
      .order("desc")
      .take(100);

  }

});

