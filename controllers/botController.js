const axios = require('axios');
const { getModels } = require('../models/index.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

async function safeGeminiCall(modelName, contents) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 8000);
    genAI.getGenerativeModel({ model: modelName })
      .generateContent(contents)
      .then(res => { clearTimeout(timeout); resolve(res.response.text()); })
      .catch(err => { clearTimeout(timeout); reject(err); });
  });
}

async function askGemini(userMessage, senderInfo = 'Invitado', eventosContexto = "", history = []) {
  const systemPrompt = `Eres el asistente virtual de gestión de eventos de la UNIFRANZ.
  📌 INSTRUCCIONES:
  - Responde SOLO con la información proporcionada en el contexto.
  - Si falta un dato, di claramente: "No tengo información actualizada sobre X".
  - Sé conciso (máx 3-4 líneas). Usa formato claro.
  📊 CONTEXTO DEL EVENTO/SISTEMA:
  ${eventosContexto || "Sin contexto específico disponible."}`;

  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    ...history.slice(-6), // Últimos 6 intercambios para ahorrar tokens
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  for (const model of ['gemini-2.0-flash', 'gemini-1.5-flash']) {
    try {
      return await safeGeminiCall(model, contents);
    } catch (err) {
      console.warn(`⚠️ Fallo con ${model}:`, err.message);
    }
  }
  return "⚠️ Servicio temporalmente ocupado. Intenta en unos segundos.";
}


function getMessage() {
  try {
    return getModels()?.Message || null;
  } catch (_) {
    return null;
  }
}

const getMessages = async (req, res) => {
  try {
    const { platform, externalId } = req.params;
    res.json({ platform, externalId, messages: [] });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
};

const botStatus = (req, res) => {
  res.json({ status: 'online', platform: 'gemini', timestamp: new Date().toISOString() });
};

const telegramWebhook = async (req, res) => {
  const { message } = req.body;
  if (!message?.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const senderInfo = message.from?.username
    ? `@${message.from.username}`
    : (message.from?.first_name || 'Estudiante');

  try {
    const aiResponse = await askGemini(message.text, senderInfo);
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: aiResponse,
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('❌ telegramWebhook error:', error.message);
    // Opcional: Enviar un mensaje de "estoy ocupado" al usuario en Telegram
  }
  res.status(200).send('OK');
};

const whatsappWebhook = async (req, res) => {
  res.status(200).json({ received: true });
};

const appChat = async (req, res) => {
  try {
    const models = getModels();
    const { Evento, Message } = models;
    const { message, sender = 'invitado', eventId, history = [] } = req.body;

    if (!message?.trim()) return res.status(400).json({ error: 'Mensaje vacío' });

    let eventosContexto = "";

    // 🎯 Si viene eventId, contexto específico. Si no, lista general.
    if (Evento && eventId) {
      const evento = await Evento.findByPk(eventId, {
        attributes: ['nombreevento', 'fechaevento', 'descripcion', 'lugarevento', 'estado']
      });
      if (evento) {
        eventosContexto = `EVENTO ACTIVO:\n- Nombre: ${evento.nombreevento}\n- Fecha: ${evento.fechaevento}\n- Lugar: ${evento.lugarevento}\n- Estado: ${evento.estado}\n- Descripción: ${evento.descripcion}`;
      }
    } else if (Evento) {
      const lista = await Evento.findAll({ where: { estado: 'activo' }, limit: 4, attributes: ['nombreevento', 'fechaevento', 'estado'] });
      eventosContexto = "Eventos activos:\n" + lista.map(e => `- ${e.nombreevento} (${e.fechaevento}) [${e.estado}]`).join('\n');
    }

    const reply = await askGemini(message, sender, eventosContexto, history);

    // 💾 Guardar historial (recomendado añadir eventId o sessionId a tu modelo Message)
    if (Message && sender !== 'invitado') {
      await Promise.all([
        Message.create({ sender, text: message, role: 'user', eventId: eventId || null, timestamp: new Date() }),
        Message.create({ sender, text: reply, role: 'bot', eventId: eventId || null, timestamp: new Date() })
      ]);
    }

    res.json({ reply, eventId });
  } catch (error) {
    console.error('❌ Error en appChat:', error);
    res.status(500).json({ error: 'Error interno al procesar la solicitud.' });
  }
};


const getChatHistory = async (req, res) => {
  try {
    const Message = getMessage();
    const { email } = req.params;
    if (!email || email === 'invitado' || !Message) {
      return res.json({ messages: [] });
    }
    const messages = await Message.findAll({
      where: { sender: email },
      order: [['timestamp', 'ASC']],
      limit: 50,
      attributes: ['id', 'text', 'role', 'timestamp'],
    });
    res.json({
      messages: messages.map(m => ({
        id: m.id?.toString(),
        text: m.text,
        sender: m.role === 'user' ? 'user' : 'bot',
        timestamp: m.timestamp,
      })),
    });
  } catch (error) {
    console.error('❌ getChatHistory error:', error);
    res.status(500).json({ error: 'Error al cargar el historial' });
  }
};

module.exports = {
  getMessages,
  telegramWebhook,
  whatsappWebhook,
  botStatus,
  appChat,
  getChatHistory,
};