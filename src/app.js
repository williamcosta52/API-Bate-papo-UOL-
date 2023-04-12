import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dayjs from "dayjs";
import { MongoClient } from "mongodb";

const app = express();

app.use(cors);
app.use(express.json());
dotenv.config();

const dayjs = require("dayjs");
const mongoClient = new MongoClient(process.env.DATABASE_URL);

let db;
const PORT = 5000;

mongoClient
	.connect()
	.then(() => {
		db = mongoClient.db();
	})
	.catch((err) => console.log(err.message));

app.post("/participantes", (req, res) => {
	const { name } = req.body;
	db.collection("participantes")
		.insertOne({ name, lastStatus: Date.now() })
		.then(() => res.sendStatus(201))
		.catch();

	const infoMessages = {
		from: name,
		to: "Todos",
		text: "entra na sala...",
		type: "status",
		time: dayjs().format(),
	};

	db.collection("messages").insertOne();
});

app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
