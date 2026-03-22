# Razorpay Proguard Rules
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.razorpay.** {*;}
-keep class com.google.android.gms.ads.identifier.AdvertisingIdClient {*;}
-keep class com.google.android.gms.ads.identifier.AdvertisingIdClient$Info {*;}
-dontwarn com.razorpay.**
