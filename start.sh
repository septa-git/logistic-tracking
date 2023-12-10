#!/bin/bash

# Jalankan server_1.js
echo "Menjalankan server_1.js"
node server_1.js &
sleep 1

# Jalankan server_2.js
echo "Menjalankan server_2.js"
node server_2.js &
sleep 1

# Jalankan server_3.js
echo "Menjalankan server_3.js"
node server_3.js &
sleep 1

# Jalankan server_4.js
echo "Menjalankan server_4.js"
node server_4.js &
sleep 1

# Jalankan server_5.js
echo "Menjalankan server_5.js"
node server_5.js &
sleep 1

echo "Semua server telah dijalankan"