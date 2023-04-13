import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from "joi";
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

app.post("/participantes", async (req, res) => {
	const { name } = req.body;
	const userSchema = joi.object({
		name: joi.string().required(),
	});
	const valid = userSchema.validate(name, { abortEarly: false });

	if (valid.error) return res.sendStatus(422);

	db.collection("participantes").insertOne({ name, lastStatus: Date.now() });

	const infoMessages = {
		from: name,
		to: "Todos",
		text: "entra na sala...",
		type: "status",
		time: dayjs().format("HH:mm:ss"),
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

app.post("/messages", (req, res) => {
	const { to, text, type } = req.body;
	const { user } = req.headers;
	const message = joi.object({
		to: joi.string().required(),
		text: joi.string().required(),
		type: joi.string().valid("message", "private_message").required(),
	});

	const valid = message.validate({ to, text, type }, { abortEarly: false });

	if (valid.error) return res.sendStatus(422);

	db.collection("participantes")
		.find({ name: user })
		.catch((err) => res.status(422).send(err.message));
});

app.get("/messages", (req, res) => {
	const { user } = req.headers;
	let limit;
	let showMessages;

	const messages = db
		.collection("messages")
		.find({ $or: [{ from: user }, { to: user }, { to: "todos" }] })
		.toArray();

	if (req.query.limit) {
		limit = Number(req.query.limit);
		if (limit < 1 || isNaN(limit)) {
			res.sendStatus(422);
		} else {
			showMessages = messages.slice(-limit).reverse();
			return res.status(200).send(showMessages);
		}
	} else if (!limit) {
		res.send(messages);
	}
});

app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
