
import { mutation } from "./_generated/server";
import { v } from "convex/values";


function assertSecret(secret:string){

 const expected =
 process.env.STRIPE_WEBHOOK_SHARED_SECRET;

 if(!expected || secret !== expected){
   throw new Error("Unauthorized");
 }

}


export const createAuditLog = mutation({

 args:{
   serverSecret:v.string(),
   adminId:v.string(),
   action:v.string(),
   resourceType:v.string(),
   resourceId:v.string(),
   status:v.union(
     v.literal("success"),
     v.literal("failed")
   ),
   metadata:v.optional(v.string())
 },


 handler:async(ctx,args)=>{

   assertSecret(args.serverSecret);


   return await ctx.db.insert(
     "adminActions",
     {
       ...args,
       createdAt:Date.now()
     }
   );

 }

});

