#!/bin/bash
# Script to generate the Payment Flow Animation GIF
# Created by Antigravity AI

# 1. Clean up temporary files
rm -f tmp_*.png f*_v*.png patched_*.jpg step3_erased.jpg

# 2. Resize base images
convert step1_base.jpg -resize 472x1024! base_s1.png
convert step2_base.jpg -resize 472x1024! base_s2.png
convert step3_base.jpg -resize 472x1024! base_s3.png
convert step4_base.jpg -resize 472x1024! base_s4.png
convert step5_base.jpg -resize 472x1024! base_s5.png

# 3. Refine Step 1 (Annotated & Click Pulse)
# Annotation box at y=680-880
convert base_s1.png -fill white -draw "rectangle 0,680 472,880" \
-fill "#2563eb" -pointsize 18 -gravity North \
-annotate +0+700 'Open Gpay. Click "Pay anyone" and click paste.' \
-annotate +0+730 "The UPI id is already copied. It will give" \
-annotate +0+760 "sribagavathmission.63022941@hdfcbank" s1_annotated.png

# Click center 177,400
convert s1_annotated.png -fill "rgba(255,0,0,0.4)" -stroke red -strokewidth 2 -draw "circle 177,400 189,400" s1_c1.png
convert s1_annotated.png -fill "rgba(255,0,0,0.4)" -stroke red -strokewidth 2 -draw "circle 177,400 202,400" s1_c2.png
convert s1_annotated.png -fill "rgba(255,0,0,0.4)" -stroke red -strokewidth 2 -draw "circle 177,400 215,400" s1_c3.png

# 4. Refine Step 2 (Change ₹1 to ₹5,000)
# White out ₹1 area and draw new amount
convert base_s2.png -fill white -stroke white -draw "rectangle 190,220 260,285" \
-fill black -font "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" -pointsize 44 -gravity North -annotate +0+225 '₹5,000' s2_patched.png

# Add Step 2 annotation
convert s2_patched.png -fill white -draw "rectangle 0,400 472,500" \
-fill "#2563eb" -pointsize 24 -gravity Center -annotate +0-60 'Step 2: Pay & Share Receipt' s2_final.png

# 5. Refine Step 3 (Erase ₹1 in preview & Click More)
# Erase ₹1 and add annotation
convert base_s3.png -fill white -stroke white -draw "rectangle 225,360 255,385" \
-fill white -draw "rectangle 0,400 472,500" \
-fill "#2563eb" -pointsize 24 -gravity Center -annotate +0-60 'Step 3: Click More' s3_annotated.png

# Click center 398,845
convert s3_annotated.png -fill "rgba(255,0,0,0.4)" -stroke red -strokewidth 2 -draw "circle 398,845 410,845" s3_c1.png
convert s3_annotated.png -fill "rgba(255,0,0,0.4)" -stroke red -strokewidth 2 -draw "circle 398,845 423,845" s3_c2.png
convert s3_annotated.png -fill "rgba(255,0,0,0.4)" -stroke red -strokewidth 2 -draw "circle 398,845 436,845" s3_c3.png

# 6. Refine Step 4 (Selection Click)
convert base_s4.png -fill white -draw "rectangle 0,400 472,500" \
-fill "#2563eb" -pointsize 24 -gravity Center -annotate +0-60 'Step 4: Select Sri Bagavath' s4_annotated.png

# Click center 75,535
convert s4_annotated.png -fill "rgba(255,0,0,0.4)" -stroke red -strokewidth 2 -draw "circle 75,535 87,535" s4_c1.png
convert s4_annotated.png -fill "rgba(255,0,0,0.4)" -stroke red -strokewidth 2 -draw "circle 75,535 100,535" s4_c2.png
convert s4_annotated.png -fill "rgba(255,0,0,0.4)" -stroke red -strokewidth 2 -draw "circle 75,535 113,535" s4_c3.png

# 7. Refine Step 5 (Finished)
convert base_s5.png -fill white -draw "rectangle 0,400 472,500" \
-fill "#2563eb" -pointsize 24 -gravity Center -annotate +0-60 'Step 5: Registration Auto-attached!' s5_final.png

# 8. Compile the Final GIF
echo "Compiling final GIF..."
convert -loop 0 \
-delay 600 s1_annotated.png \
-delay 60 s1_c1.png -delay 20 s1_c1.png s1_c2.png -delay 30 s1_c3.png s1_c2.png s1_c1.png s1_c2.png s1_c3.png s1_c2.png s1_c1.png s1_c2.png s1_c3.png s1_c2.png s1_c1.png s1_c2.png s1_c3.png s1_c2.png \
-delay 60 s1_c1.png \
-delay 600 s2_final.png \
-delay 60 s3_annotated.png -delay 15 s3_c1.png s3_c2.png \
-delay 30 s3_c3.png s3_c2.png s3_annotated.png s3_c2.png s3_c3.png s3_c2.png s3_annotated.png s3_c2.png s3_c3.png s3_c2.png s3_annotated.png s3_c2.png s3_c3.png s3_c2.png \
-delay 60 s3_annotated.png \
-delay 60 s4_annotated.png -delay 15 s4_c1.png s4_c2.png \
-delay 30 s4_c3.png s4_c2.png s4_annotated.png s4_c2.png s4_c3.png s4_c2.png s4_annotated.png s4_c2.png s4_c3.png s4_c2.png s4_annotated.png s4_c2.png s4_c3.png s4_c2.png \
-delay 60 s4_annotated.png \
-delay 600 s5_final.png payment_flow_generated.gif

echo "Done! Final GIF saved as payment_flow_generated.gif"
# Clean up temps
rm -f base_s*.png s1_*.png s2_*.png s3_*.png s4_*.png s5_*.png patched_*.jpg step3_erased.jpg
