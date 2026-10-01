
export const ADMIN_EMAILS = [
  "operations@functionhour.com",
].map(
  (email)=>email.toLowerCase()
);


export function getAdminUserIds(){

return (
process.env.SUPPORT_ADMIN_USER_IDS ?? ""
)
.split(",")
.map(
(id)=>id.trim()
)
.filter(Boolean);

}


export function isAdminEmail(email?:string|null){

if(!email) return false;

return ADMIN_EMAILS.includes(
email.trim().toLowerCase()
);

}

