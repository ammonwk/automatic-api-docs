# ./deployReact.sh -k "C:\Users\ammon\Documents\Robotics-Programming\BYU\cs260\keys\production.pem" -h rmplanner.click -s clinic-collect
# ssh -i "C:\Users\ammon\Documents\Robotics-Programming\BYU\cs260\keys\production.pem" ubuntu@34.238.113.27
# pm2 logs

while getopts k:h:s: flag
do
    case "${flag}" in
        k) key=${OPTARG};;
        h) hostname=${OPTARG};;
        s) service=${OPTARG};;
    esac
done

if [[ -z "$key" || -z "$hostname" || -z "$service" ]]; then
    printf "\nMissing required parameter.\n"
    printf "  syntax: deployService.sh -k <pem key file> -h <hostname> -s <service>\n\n"
    exit 1
fi

printf "\n----> Deploying bundle $service to $hostname with key $key\n"

# Step 1: Build the distribution package
printf "\n----> Building the distribution package\n"
rm -rf build
mkdir build

# Build the React front end
npm install              # ensure dependencies (like vite) are installed
npm run build            # build the React front end
cp -rf dist build/public # move the React front end to the build directory

# Build the TS backend service
printf "\n----> Building the TS backend service\n"
cd service
npm install              # install backend dependencies
npm run build            # compile TypeScript to JavaScript (ensure tsconfig.json outputs to 'dist')
cd ..
cp -rf service/dist/* build  # copy the compiled backend files
mkdir -p build/scripts # create the scripts directory in the build folder
cp -rf service/scripts/* build/scripts # copy the scripts to the build directory
cp service/*.json build      # copy any JSON config files
cp service/.env build       # copy the .env file

# Step 2: Clear out previous distribution on the target server
printf "\n----> Clearing out previous distribution on the target\n"
ssh -i "$key" ubuntu@$hostname << ENDSSH
rm -rf services/${service}
mkdir -p services/${service}
ENDSSH

# Step 3: Copy the distribution package to the target server
printf "\n----> Copy the distribution package to the target\n"
scp -r -i "$key" build/* ubuntu@$hostname:services/$service
printf "\n----> Copying environment variables\n"
scp -i "$key" service/.env ubuntu@$hostname:services/$service/.env

# Step 4: Deploy the service on the target server
printf "\n----> Deploy the service on the target\n"
ssh -i "$key" ubuntu@$hostname << ENDSSH
bash -i
cd services/${service}
npm install
export NODE_ENV=production
if pm2 list | grep -q ${service}; then
  pm2 restart ${service}
else
  pm2 start index.js --name ${service}
  pm2 save
fi
ENDSSH

# Step 5: Remove the local copy of the distribution package
printf "\n----> Removing local copy of the distribution package\n"
rm -rf build
rm -rf dist
rm -rf service/dist
