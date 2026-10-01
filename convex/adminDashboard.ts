
import { query } from "./_generated/server";


export const metrics = query({

args:{},

handler: async(ctx)=>{


const events =
await ctx.db.query("events").collect();


const orders =
await ctx.db.query("ticketOrders").collect();


const payouts =
await ctx.db
.query("organizerPayoutRequests")
.collect();


const disputes =
await ctx.db
.query("stripeDisputes")
.collect();


const users =
await ctx.db
.query("users")
.collect();


const checkins =
await ctx.db
.query("checkInActivity")
.collect();



const revenue =
orders.reduce(
(sum,item)=>sum+(item.netAmount ?? 0),
0
);


return {

revenue,

ticketsSold:orders.length,

activeEvents:
events.length,


pendingPayouts:
payouts.filter(
(p)=>p.status==="requested"
).length,


disputes:
disputes.filter(
(d)=>
d.status==="warning" ||
d.status==="needs_response" ||
d.status==="under_review"
).length,


verificationRequests:
users.filter(
(u)=>u.verificationRequested
).length,


checkIns:
checkins.length

};


}

});


export const payoutQueue=query({

args:{},

handler:async(ctx)=>{


return await ctx.db
.query("organizerPayoutRequests")
.order("desc")
.take(50);


}

});



export const verificationQueue=query({

args:{},

handler:async(ctx)=>{


return await ctx.db
.query("users")
.withIndex(
"by_verificationRequested",
(q)=>q.eq(
"verificationRequested",
true
))
.collect();


}

});


export const disputes=query({

args:{},

handler:async(ctx)=>{


return await ctx.db
.query("stripeDisputes")
.order("desc")
.take(50);


}

});


