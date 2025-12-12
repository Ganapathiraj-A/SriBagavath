npm run build
npx cap sync android
cd android
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
./gradlew -version

./gradlew clean  assembleDebug
