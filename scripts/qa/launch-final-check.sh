
#!/bin/bash

set -e

BASE_URL=${1:-https://functionhour.com}


echo "================================="
echo " FUNCTION HOUR LAUNCH QA"
echo "================================="


check(){

URL=$1
NAME=$2

CODE=$(curl -L -s -o /dev/null -w "%{http_code}" "$URL")


if [[ "$CODE" =~ ^(200|301|302)$ ]]
then
 echo "✅ PASS $NAME ($CODE)"
else
 echo "❌ FAIL $NAME ($CODE)"
 exit 1
fi

}



echo ""
echo "=== Core Pages ==="

check "$BASE_URL" "Homepage"

check "$BASE_URL/events" "Event Directory"

check "$BASE_URL/map" "Event Map"

check "$BASE_URL/my-tickets" "Ticket Wallet"

check "$BASE_URL/privacy" "Privacy"

check "$BASE_URL/terms" "Terms"



echo ""
echo "=== API Health ==="


check "$BASE_URL/api/health" "Application Health"

check "$BASE_URL/api/health/support" "Support Health"



echo ""
echo "=== Security Checks ==="


if curl -s "$BASE_URL" | grep -qi "Outside Crowd"
then

 echo "❌ Old branding detected"
 exit 1

else

 echo "✅ Branding clean"

fi



echo ""
echo "=== Secret Exposure Scan ==="


FOUND=$(grep -R -E "sk_live_[A-Za-z0-9]{20,}|sk_test_[A-Za-z0-9]{20,}" app convex lib \
 --exclude-dir=node_modules \
 --exclude-dir=.next \
 --exclude-dir=.git \
 2>/dev/null || true)


if [ -n "$FOUND" ]

then

 echo "❌ Possible Stripe secret found in source:"
 echo "$FOUND"
 exit 1

else

 echo "✅ Secret scan clean"

fi



echo ""
echo "================================="
echo " FINAL QA COMPLETE"
echo "================================="

