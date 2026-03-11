#!/bin/bash

PHONE_IP=192.168.1.3

echo "Waiting for wireless debugging..."

while true
do
    adb connect $PHONE_IP > /dev/null 2>&1
    adb devices | grep $PHONE_IP

    sleep 3
done