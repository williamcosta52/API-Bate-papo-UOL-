import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dayjs from "dayjs";
import { MongoClient } from "mongodb";

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();

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

	db.collection("messages").insertOne(infoMessages);
});

app.get("/participantes", (req, res) => {
	db.collection("participantes")
		.find()
		.toArray()
		.then((r) => res.send(r))
		.catch((err) => {
			console.error("Erro ao obter participantes do banco de dados:", err);
			res.sendStatus(500);
		});
});

app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
