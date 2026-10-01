
#!/bin/bash
set -e


BASE_URL=${1:-https://functionhour.com}


echo "================================="
echo " FUNCTION HOUR PRODUCTION SMOKE"
echo "================================="


check_url(){

  URL=$1
  NAME=$2

  STATUS=$(curl -L -s -o /dev/null -w "%{http_code}" "$URL")

  if [[ "$STATUS" =~ ^(200|301|302)$ ]]; then
    echo "PASS $NAME ($STATUS)"
  else
    echo "FAIL $NAME ($STATUS)"
    exit 1
  fi

}


echo ""
echo "=== Public Pages ==="

check_url "$BASE_URL/" "Homepage"

check_url "$BASE_URL/events" "Event Directory"

check_url "$BASE_URL/map" "Map"

check_url "$BASE_URL/privacy" "Privacy"

check_url "$BASE_URL/terms" "Terms"


echo ""
echo "=== Health APIs ==="

check_url "$BASE_URL/api/health" "Health API"

check_url "$BASE_URL/api/health/support" "Support Health"


echo ""
echo "=== Security Checks ==="


if curl -s "$BASE_URL" | grep -qi "Outside Crowd"; then

 echo "FAIL Old OC branding detected"

 exit 1

else

 echo "PASS Branding check"

fi


if curl -s "$BASE_URL" | grep -qi "stripe_secret"; then

 echo "FAIL Secret exposure detected"

 exit 1

else

 echo "PASS Secret exposure check"

fi


echo ""
echo "================================="
echo " SMOKE TEST COMPLETE"
echo "================================="

