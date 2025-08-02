#!/bin/bash

# Fonts klasörü oluştur
mkdir -p src/fonts

# DejaVu Sans fontlarını indir (Türkçe karakterleri destekler)
echo "DejaVu Sans fontları indiriliyor..."
curl -o src/fonts/DejaVuSans.ttf "https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans.ttf"
curl -o src/fonts/DejaVuSans-Bold.ttf "https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans-Bold.ttf"

# Alternatif olarak Roboto fontları (Google Fonts'tan)
echo "Roboto fontları indiriliyor..."
curl -o src/fonts/Roboto-Regular.ttf "https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Regular.ttf"
curl -o src/fonts/Roboto-Bold.ttf "https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Bold.ttf"

echo "Fontlar başarıyla indirildi!"
echo "src/fonts/ klasöründe:"
ls -la src/fonts/