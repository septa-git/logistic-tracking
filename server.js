const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const mongoose = require("mongoose");
const axios = require("axios");
const moment = require("moment");
const fs = require("fs");

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));

// Menggunakan memory storage untuk multer agar file tidak disimpan di disk
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const username = "myangkasasa";
const password = "GxAJRKhHelscM5gM";
const url = `mongodb+srv://${username}:${password}@cluster0.nrt1pdw.mongodb.net/`;
const dbName = "blitz";
const collectionName = "data";

mongoose
  .connect(url + dbName, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(err));

const dataSchema = new mongoose.Schema({
  co_name: String,
  sell_id: String,
  slot: String,
  tgl: {
    // Mengubah definisi untuk bidang "tgl"
    type: String, // Mengganti tipe data menjadi String
    get: (v) => new Date(v), // Menggunakan fungsi new Date(v) untuk mengonversi string ke objek Date
  },
  co_prov: String,
  co_city: String,
  co_count: String,
  co_add: String,
  coe_name: String,
  coe_prov: String,
  coe_city: String,
  coe_count: String,
  coe_add: String,
  example_coe_add: String,
  assignee: String,
  co_lat: Number,
  co_lng: Number,
  coe_lat: Number,
  coe_lng: Number,
  distance: String,
  directionsLink: String,
  travelTime: String,
});

const Data = mongoose.model(collectionName, dataSchema);

const addressSchema = new mongoose.Schema({
  co_name: String,
  co_add: String,
  co_address: String,
  co_lat: Number,
  co_lng: Number,
});

const Address = mongoose.model("addresses", addressSchema);

app.get("/", (req, res) => {
  Data.find({})
    .then((data) => {
      res.render("index", {
        data: data.map((d) => d.toObject({ getters: true })),
      });
    })
    .catch((err) => console.error(err));
});

app.post("/upload", upload.single("excel"), (req, res) => {
  // Membaca file dari buffer yang diberikan oleh multer
  const workbook = xlsx.read(req.file.buffer, {
    cellDates: true,
    dateNF: "dd/mm/yyyy",
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  Data.deleteMany({})
    .then(() => console.log("Deleted old data"))
    .catch((err) => console.error(err));

  // Menyalin nilai dari "coe_add" ke "example_coe_add" sebelum menyimpannya ke MongoDB
  data.forEach((item) => {
    item.example_coe_add = item.coe_add;
  });

  Data.insertMany(data)
    .then(() => console.log("Inserted new data"))
    .catch((err) => console.error(err));

  res.send("File excel berhasil diunggah dan disimpan ke MongoDB");
});

app.post("/update", (req, res) => {
  Data.find({})
    .then((data) => {
      data.forEach((item) => {
        Address.findOne({ co_name: item.co_name })
          .then((address) => {
            if (address) {
              Data.updateOne(
                { _id: item._id },
                { co_lat: address.co_lat, co_lng: address.co_lng }
              )
                .then(() => {
                  console.log("Updated location for " + item.sell_id);
                  const googleMapsApiKey =
                    "AIzaSyB0yflWwoIPndExhWhoHKOC8pSYCeG_fF8";
                  const googleMapsApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${address.co_lat},${address.co_lng}&key=${googleMapsApiKey}`;
                  axios
                    .get(googleMapsApiUrl)
                    .then((response) => {
                      const results = response.data.results;
                      if (results.length > 0) {
                        const location = results[0];
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

        const destination = `${item.coe_prov}, ${item.coe_city}, ${item.coe_count}, ${item.coe_add}`;
        const googleMapsApiKey = "AIzaSyB0yflWwoIPndExhWhoHKOC8pSYCeG_fF8";
        const googleMapsApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${destination}&key=${googleMapsApiKey}`;
        axios
          .get(googleMapsApiUrl)
          .then((response) => {
            const results = response.data.results;
            if (results.length > 0) {
              const location = results[0];
              Data.updateOne(
                { _id: item._id },
                {
                  coe_lat: location.geometry.location.lat,
                  coe_lng: location.geometry.location.lng,
                }
              )
                .then(() => {
                  console.log("Updated destination for " + item.sell_id);
                  const googleMapsApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.geometry.location.lat},${location.geometry.location.lng}&key=${googleMapsApiKey}`;
                  axios
                    .get(googleMapsApiUrl)
                    .then((response) => {
                      const results = response.data.results;
                      if (results.length > 0) {
                        const location = results[0];
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

      // Menambahkan kode untuk mengirim respon dengan status 200 dan pesan "Lokasi berhasil diperbaharui dari MongoDB"
      res.status(200).send("Lokasi berhasil diperbaharui dari MongoDB");
    })
    .catch((err) => console.error(err));
});

app.post("/distance", (req, res) => {
  Data.find({})
    .then((data) => {
      // Menambahkan variabel untuk menyimpan jumlah dokumen yang diproses
      let processed = 0;
      // Menambahkan variabel untuk menyimpan jumlah dokumen yang ada di koleksi data
      const total = data.length;
      data.forEach((item) => {
        const googleMapsApiKey = "AIzaSyB0yflWwoIPndExhWhoHKOC8pSYCeG_fF8";
        const mode = "driving";
        const googleMapsApiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${item.co_lat},${item.co_lng}&destinations=${item.coe_lat},${item.coe_lng}&mode=${mode}&key=${googleMapsApiKey}`;

        axios
          .get(googleMapsApiUrl)
          .then((response) => {
            const results = response.data.rows[0].elements[0];

            if (results.status === "OK") {
              const distance = results.distance.text;
              const travelTime = results.duration.text;

              console.log("Distance for " + item.sell_id + ": " + distance);
              console.log(
                "Travel time for " + item.sell_id + ": " + travelTime
              );

              Data.updateOne(
                { _id: item._id },
                { distance: distance, travelTime: travelTime }
              )
                .then(() => {
                  const directionsLink = `https://www.google.com/maps/dir/${item.co_lat},${item.co_lng}/${item.coe_lat},${item.coe_lng}/@${item.co_lat},${item.co_lng},13z/data=!3m1!4b1`;
                  Data.updateOne(
                    { _id: item._id },
                    { directionsLink: directionsLink }
                  )
                    .then(() =>
                      console.log("Updated directions link for " + item.sell_id)
                    )
                    .catch((err) => console.error(err));

                  console.log(
                    "Updated distance and travel time for " + item.sell_id
                  );
                })
                .catch((err) => console.error(err));
            }

            // Menambahkan satu ke variabel processed setiap kali dokumen selesai diproses
            processed++;
            // Menambahkan kondisi untuk mengirim respon dan menyembunyikan indikator loading jika semua dokumen sudah diproses
            if (processed === total) {
              res.send(
                "Jarak kilometer, waktu tempuh, dan tautan arah berhasil ditemukan dan disimpan di MongoDB"
              );
              // Menyembunyikan indikator loading dengan mengirim sinyal ke file index.ejs
              res.app.emit("hideLoading");
            }
          })
          .catch((err) => console.error(err));
      });
    })
    .catch((err) => console.error(err));
});

// Menambahkan kode program untuk mengekspor data ke file excel
app.get("/export", (req, res) => {
  Data.find({ distance: { $exists: true, $ne: null } }) // Filter data yang memiliki nilai pada properti "Distance"
    .then((data) => {
      const exportData = data.map((item) => ({
        sell_id: item.sell_id,
        slot: item.slot,
        tgl: item.tgl,
        co_name: item.co_name,
        co_prov: item.co_prov,
        co_city: item.co_city,
        co_count: item.co_count,
        co_add: item.co_add,
        co_lat: item.co_lat,
        co_lng: item.co_lng,
        coe_name: item.coe_name,
        coe_prov: item.coe_prov,
        coe_city: item.coe_city,
        coe_count: item.coe_count,
        coe_add: item.coe_add,
        example_coe_add: item.example_coe_add,
        coe_lat: item.coe_lat,
        coe_Lng: item.coe_lng,
        assignee: item.assignee,
        distance: item.distance,
        travel_time: item.travelTime,
        directions_link: item.directionsLink,
      }));

      const ws = xlsx.utils.json_to_sheet(exportData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Data");

      const excelFileName = "data-successfully.xlsx";
      xlsx.writeFile(wb, excelFileName);

      res.download(excelFileName, (err) => {
        if (!err) {
          fs.unlinkSync(excelFileName);
        }
      });
    })
    .catch((err) => console.error(err));
});

app.get("/export-failed", (req, res) => {
  Data.find({ distance: { $exists: false, $eq: null } }) // Filter data yang tidak memiliki nilai pada properti "Distance"
    .then((data) => {
      const exportData = data.map((item) => ({
        sell_id: item.sell_id,
        slot: item.slot,
        tgl: item.tgl,
        co_name: item.co_name,
        co_prov: item.co_prov,
        co_city: item.co_city,
        co_count: item.co_count,
        co_add: item.co_add,
        co_lat: item.co_lat,
        co_lng: item.co_lng,
        coe_name: item.coe_name,
        coe_prov: item.coe_prov,
        coe_city: item.coe_city,
        coe_count: item.coe_count,
        coe_add: item.coe_add,
        example_coe_add: item.example_coe_add,
        coe_lat: item.coe_lat,
        coe_Lng: item.coe_lng,
        assignee: item.assignee,
        distance: item.distance,
        travel_time: item.travelTime,
        directions_link: item.directionsLink,
      }));

      const ws = xlsx.utils.json_to_sheet(exportData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Data");

      const excelFileName = "data-failed.xlsx";
      xlsx.writeFile(wb, excelFileName);

      res.download(excelFileName, (err) => {
        if (!err) {
          fs.unlinkSync(excelFileName);
        }
      });
    })
    .catch((err) => console.error(err));
});

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});
