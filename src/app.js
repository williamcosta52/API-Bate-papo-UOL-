import express, { json } from "express";
import cors from "cors";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from "joi";
import { MongoClient } from "mongodb";

const app = express();

app.use(cors());
app.use(json());
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
	await mongoClient.connect();
} catch (err) {
	console.log(err.message);
}
const db = mongoClient.db();
const PORT = 5000;

app.post("/participants", async (req, res) => {
	const { name } = req.body;

	if (!name) return res.status(422).send("Missing required field: name");

	const userSchema = joi.object({
		name: joi.string().min(1).required(),
	});
	const validation = userSchema.validate({ name: name }, { abortEarly: false });

	if (validation.error) {
		const errors = validation.error.details.map((d) => d.message);

		return res.status(422).send(errors);
	}
	const verifyUser = await db
		.collection("participants")
		.findOne({ name: name });

	if (verifyUser) return res.sendStatus(409);

	try {
		await db
			.collection("participants")
			.insertOne({ name: name, lastStatus: Date.now() });

		const infoMessages = {
			from: name,
			to: "Todos",
			text: "entra na sala...",
			type: "status",
			time: dayjs().format("HH:mm:ss"),
		};

		await db.collection("messages").insertOne(infoMessages);
	} catch (err) {
		res.send(err.message);
	}
	return res.sendStatus(201);
});

app.get("/participants", async (req, res) => {
	try {
		const users = await db.collection("participants").find().toArray();
		if (!users) return res.sendStatus(404);
		res.send(users);
	} catch (err) {
		console.error("Erro ao obter participantes do banco de dados:", err);
		res.sendStatus(500);
	}
});

app.post("/messages", async (req, res) => {
	const { to, text, type } = req.body;
	const { user } = req.headers;

	try {
		const participant = await db
			.collection("participants")
			.findOne({ name: user });

		if (!participant) return res.sendStatus(422);

		const message = joi.object({
			to: joi.string().required(),
			text: joi.string().required(),
			type: joi.string().valid("message", "private_message").required(),
		});

		const validation = message.validate(
			{ to, text, type },
			{ abortEarly: false }
		);

		if (validation.error) return res.sendStatus(422);

		await db.collection("messages").insertOne({
			from: user,
			to,
			text,
			type,
			time: dayjs(Date.now()).format("HH:mm:ss"),
		});
		return res.sendStatus(201);
	} catch (err) {
		res.status(422).send(err.message);
	}
});

app.get("/messages", async (req, res) => {
	const { user } = req.headers;
	let limit;
	let showMessages;

	try {
		const messages = await db
			.collection("messages")
			.find({ $or: [{ from: user }, { to: user }, { to: "Todos" }] })
			.toArray();

		if (!req.query.limit) return res.send(messages);

		if (req.query.limit) {
			limit = Number(req.query.limit);
			if (limit < 1 || isNaN(limit)) {
				res.sendStatus(422);
			} else {
				showMessages = messages.slice(-limit).reverse();
				return res.status(200).send(showMessages);
			}
		} else {
			limit = Number(req.query.limit);
			showMessages = messages.slice(-limit).reverse();
			return res.status(200).send(showMessages);
		}
	} catch (err) {
		res.send(err.message);
	}
});

app.post("/status", async (req, res) => {
	const { user } = req.headers;

	if (!user) return res.sendStatus(404);

	try {
		const userStatus = await db
			.collection("participants")
			.findOne({ name: user });
		if (!userStatus) res.sendStatus(404);
		userStatus.lastStatus = Date.now();
		res.sendStatus(200);
	} catch (err) {
		res.send(err);
	}
});

app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
