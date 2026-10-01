
import { auth, currentUser } from "@clerk/nextjs/server";
import {
getAdminUserIds,
isAdminEmail
} from "./adminConfig";


export async function hasFunctionHourAdminAccess(){

const session = await auth();


if(!session.userId){

console.log(
"ADMIN ACCESS DENIED: no session"
);

return false;

}


const allowedIds =
getAdminUserIds();


if(
allowedIds.includes(session.userId)
){

console.log(
"ADMIN ACCESS GRANTED: user id"
);

return true;

}



const user =
await currentUser();


const email =
user?.primaryEmailAddress
?.emailAddress;


if(
isAdminEmail(email)
&&
user?.primaryEmailAddress
?.verification
?.status==="verified"
){

console.log(
"ADMIN ACCESS GRANTED: email"
);

return true;

}



console.log(
"ADMIN ACCESS DENIED:",
{
userId:session.userId,
email
}
);


return false;


}

