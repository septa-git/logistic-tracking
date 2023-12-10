// Tidak ada perubahan pada bagian ini
// Mengimpor modul yang dibutuhkan
const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const mongoose = require("mongoose");
const axios = require("axios"); // Menambahkan modul untuk melakukan request HTTP

// Membuat aplikasi express
const app = express();

// Mengatur template engine ke ejs
app.set("view engine", "ejs");

// Mengatur folder publik sebagai folder statis
app.use(express.static("public"));

// Mengatur middleware multer untuk menyimpan file excel yang diunggah
const upload = multer({ dest: "uploads/" });

// Menghubungkan ke basis data MongoDB
const username = "myangkasasa";
const password = "GxAJRKhHelscM5gM";
const url = `mongodb+srv://${username}:${password}@cluster0.nrt1pdw.mongodb.net/`;
const dbName = "blitz";
const collectionName = "address";

mongoose
  .connect(url + dbName, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(err));

// Membuat skema dan model untuk koleksi data
const dataSchema = new mongoose.Schema({
  co_name: String,
  co_add: String,
  co_address: String,
  co_lat: Number,
  co_lng: Number,
});

const Data = mongoose.model(collectionName, dataSchema);

// Membuat skema dan model untuk koleksi addresses
const addressSchema = new mongoose.Schema({
  co_add: String,
  co_lat: Number,
  co_lng: Number,
});

const Address = mongoose.model("addresses", addressSchema);

// Membuat rute GET untuk halaman utama
app.get("/", (req, res) => {
  // Mencari semua data dari koleksi datas
  Data.find({})
    .then((data) => {
      // Mengirim data ke template ejs
      res.render("index", { data: data });
    })
    .catch((err) => console.error(err));
});

// Membuat rute POST untuk mengunggah file excel dan menyimpan data ke MongoDB
app.post("/upload", upload.single("excel"), (req, res) => {
  // Membaca file excel yang diunggah
  const workbook = xlsx.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  // Menghapus data lama dari koleksi data
  Data.deleteMany({})
    .then(() => console.log("Deleted old data"))
    .catch((err) => console.error(err));

  // Menyimpan data baru ke koleksi data
  Data.insertMany(data)
    .then(() => console.log("Inserted new data"))
    .catch((err) => console.error(err));

  // Mengirim pesan sukses ke klien
  res.send("File excel berhasil diunggah dan disimpan ke MongoDB");
});

// Menambahkan rute POST untuk memperbaharui lokasi dari MongoDB
app.post("/update", (req, res) => {
  // Mencari semua data dari koleksi datas
  Data.find({})
    .then((data) => {
      // Melakukan iterasi untuk setiap data
      data.forEach((item) => {
        // Mencari alamat yang sesuai dengan data dari koleksi addresses
        Address.findOne({ co_add: item.co_add })
          .then((address) => {
            // Jika alamat ditemukan, maka memperbaharui koordinat lokasi pada data
            if (address) {
              Data.updateOne(
                { _id: item._id },
                { co_lat: address.co_lat, co_lng: address.co_lng }
              )
                .then(() => {
                  console.log("Updated location for " + item.sell_id);
                  // Menambahkan fitur untuk menemukan lokasi alamat berdasarkan kordinat
                  // Mengatur URL untuk Google Maps Geocoding API
                  const googleMapsApiKey =
                    "AIzaSyD4sgjH4RAaAokyujwQO_jSeZDowQ1U9Oo";
                  const googleMapsApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${address.co_lat},${address.co_lng}&key=${googleMapsApiKey}`;
                  // Melakukan request HTTP ke Google Maps Geocoding API
                  axios
                    .get(googleMapsApiUrl)
                    .then((response) => {
                      // Mendapatkan hasil dari response
                      const results = response.data.results;
                      // Jika hasil ada, maka memilih hasil pertama sebagai lokasi alamat
                      if (results.length > 0) {
                        const location = results[0];
                        // Memperbaharui alamat pada data berdasarkan lokasi alamat
                        Data.updateOne(
                          { _id: item._id },
                          { co_add: location.formatted_address }
                        )
                          .then(() =>
                            console.log("Updated address for " + item.sell_id)
                          )
                          .catch((err) => console.error(err));
                      }
                    })
                    .catch((err) => console.error(err));
                })
                .catch((err) => console.error(err));
            }
          })
          .catch((err) => console.error(err));
        // Menambahkan fitur untuk menemukan kordinat berdasarkan dari kombinasi value pada key "coe_prov", "coe_city", "coe_count", dan "coe_add"
        // Menggabungkan value tersebut menjadi alamat tujuan
        const destination = `${item.coe_prov}, ${item.coe_city}, ${item.coe_count}, ${item.coe_add}`;
        // Mengatur URL untuk Google Maps Geocoding API
        const googleMapsApiKey = "AIzaSyD4sgjH4RAaAokyujwQO_jSeZDowQ1U9Oo";
        const googleMapsApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${destination}&key=${googleMapsApiKey}`;
        // Melakukan request HTTP ke Google Maps Geocoding API
        axios
          .get(googleMapsApiUrl)
          .then((response) => {
            // Mendapatkan hasil dari response
            const results = response.data.results;
            // Jika hasil ada, maka memilih hasil pertama sebagai kordinat tujuan
            if (results.length > 0) {
              const location = results[0];
              // Memperbaharui kordinat tujuan pada data berdasarkan alamat tujuan
              Data.updateOne(
                { _id: item._id },
                {
                  coe_lat: location.geometry.location.lat,
                  coe_lng: location.geometry.location.lng,
                }
              )
                .then(() => {
                  console.log("Updated destination for " + item.sell_id);
                  // Menambahkan fitur untuk menemukan lokasi alamat berdasarkan kordinat tujuan
                  // Mengatur URL untuk Google Maps Geocoding API
                  const googleMapsApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.geometry.location.lat},${location.geometry.location.lng}&key=${googleMapsApiKey}`;
                  // Melakukan request HTTP ke Google Maps Geocoding API
                  axios
                    .get(googleMapsApiUrl)
                    .then((response) => {
                      // Mendapatkan hasil dari response
                      const results = response.data.results;
                      // Jika hasil ada, maka memilih hasil pertama sebagai lokasi alamat tujuan
                      if (results.length > 0) {
                        const location = results[0];
                        // Memperbaharui alamat tujuan pada data berdasarkan lokasi alamat tujuan
                        Data.updateOne(
                          { _id: item._id },
                          { coe_add: location.formatted_address }
                        )
                          .then(() =>
                            console.log(
                              "Updated address destination for " + item.sell_id
                            )
                          )
                          .catch((err) => console.error(err));
                      }
                    })
                    .catch((err) => console.error(err));
                })
                .catch((err) => console.error(err));
            }
          })
          .catch((err) => console.error(err));
      });
      // Mengirim pesan sukses ke klien
      res.send("Lokasi berhasil diperbaharui dari MongoDB");
    })
    .catch((err) => console.error(err));
});

// Menambahkan rute POST untuk menemukan jarak kilometer dari MongoDB
app.post("/distance", (req, res) => {
  // Mencari dokumen yang tidak memiliki field distance
  Data.find({ distance: { $exists: false } })
    .then((data) => {
      data.forEach((item) => {
        const googleMapsApiKey = "AIzaSyD4sgjH4RAaAokyujwQO_jSeZDowQ1U9Oo";
        const googleMapsApiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${item.co_lat},${item.co_lng}&destinations=${item.coe_lat},${item.coe_lng}&key=${googleMapsApiKey}`;

        axios
          .get(googleMapsApiUrl)
          .then((response) => {
            const results = response.data.rows[0].elements[0];

            if (results.status === "OK") {
              const distance = results.distance;

              console.log(
                "Distance for " + item.sell_id + ": " + distance.text
              );

              Data.updateOne({ _id: item._id }, { distance: distance.text })
                .then(() => console.log("Updated distance for " + item.sell_id))
                .catch((err) => console.error(err));
            }
          })
          .catch((err) => console.error(err));
      });

      // Mengirimkan pesan "Jarak kilometer berhasil ditemukan dari MongoDB" ke klien
      res.send("Jarak kilometer berhasil ditemukan dari MongoDB");
    })
    .catch((err) => console.error(err));
});

// Menjalankan server pada port 2222
app.listen(2222, () => {
  console.log("Server is running on port 2222");
});
