import TelegramBot from 'node-telegram-bot-api';
import { linkTelegramAccount } from './controllers/userController.js'; 
import { getAllEventos, getEventoById , fetchAllEvents,fetchEventById, fetchEventsWithRawQuery} from './controllers/evento.js';
export const startTelegramBot=()=>{
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN; 
const API_BASE_URL = process.env.API_BASE_URL; 

if (!TELEGRAM_TOKEN ) {
  console.error("Error: Faltan variables de entorno. Asegúrate de tener TELEGRAM_TOKEN y API_BASE_URL en tu archivo .env");
  return;
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('🤖 Bot de Telegram iniciado...');

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const textoBienvenida = `
¡Hola! Soy tu bot de eventos. 🤖

Aquí tienes los comandos disponibles:
/eventos - Muestra la lista de próximos eventos.
/vincular - Vincula tu cuenta de Telegram para recibir notificaciones.
  `;
  bot.sendMessage(chatId, textoBienvenida);
});


bot.onText(/\/eventos/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, 'Buscando eventos... 🗓️');

    try {

      const eventos=await fetchEventsWithRawQuery();

      if (!eventos || eventos.length === 0) {
        await bot.sendMessage(chatId, 'No hay eventos programados por el momento.');
        return;
      }

      const inlineKeyboard = eventos.map(evento => ([
        {
          // Asegúrate que 'evento.title' y 'evento.start' coincidan con los nombres de tu modelo
          text: `📅 ${evento.title || evento.nombreevento} - ${new Date(evento.fechaevento).toLocaleDateString()}`,
          callback_data: `evento_details_${evento.idevento}` // Asegúrate que la PK se llame 'id'
        }
      ]));

      await bot.sendMessage(chatId, 'Aquí tienes los próximos eventos:', {
        reply_markup: { inline_keyboard: inlineKeyboard }
      });

    } catch (error) {
      console.error('[BOT] Error al obtener eventos:', error.message);
      await bot.sendMessage(chatId, '❌ Hubo un error al buscar los eventos.');
    }
  });


// En tu archivo bot.js

bot.onText(/\/vincular/, (msg) => {
    const chatId = msg.chat.id;
    const textoPeticion = "Para vincular tu cuenta, por favor, responde a este mensaje con el email que usaste para registrarte en nuestra plataforma.";
    
    bot.sendMessage(chatId, textoPeticion, {
        reply_markup: { force_reply: true },
    }).then(sentMessage => {
        bot.onReplyToMessage(chatId, sentMessage.message_id, async (replyMsg) => {
            const email = replyMsg.text;
            
            if (!email || !email.includes('@')) {
                await bot.sendMessage(chatId, "Eso no parece un email válido. Intenta de nuevo.");
                return;
            }

            await bot.sendMessage(chatId, `Gracias. Intentando vincular la cuenta con el email: ${email}...`);

            try {
                const mockReq = { body: { email, chat_id: chatId } };
                let responseMessage = '';
                let statusCode = 200;

                const mockRes = {
                    status: function(code) { statusCode = code; return this; },
                    json: function(data) { responseMessage = data.message; }
                };

                await linkTelegramAccount(mockReq, mockRes);

                if (statusCode >= 400) {
                    await bot.sendMessage(chatId, `❌ Hubo un problema: ${responseMessage}`);
                } else {
                    await bot.sendMessage(chatId, `✅ ¡Éxito! ${responseMessage}`);
                }

            } catch (error) {
                console.error('[BOT-HANDLER] Error al llamar a linkTelegramAccount:', error.message);
                await bot.sendMessage(chatId, `❌ Hubo un error inesperado en el servidor: ${error.message}`);
            }
        });
    });
  });
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  // Responde al callback inmediatamente para que el botón deje de mostrar "cargando"
  bot.answerCallbackQuery(callbackQuery.id);

  // Verificamos si el callback es para los detalles de un evento
  if (data.startsWith('evento_details_')) {
    const eventoId = data.split('_')[2];
    
    console.log(`[BOT] Recibido callback para detalles del evento ID: ${eventoId}`);

    try {
      // Llamamos a la función de lógica para obtener los detalles del evento
      const evento = await fetchEventById(eventoId);

      // Si la función devuelve null (no encontró el evento)
      if (!evento) {
        await bot.sendMessage(chatId, 'Lo siento, no pude encontrar los detalles de ese evento. Quizás fue eliminado.');
        return;
      }

      // Si todo va bien, construimos el mensaje de detalles
      const detallesMensaje = `
*Detalles del Evento: ${evento.nombreevento}*

📍 *Lugar:* ${evento.lugarevento || 'No especificado'}
🗓️ *Fecha:* ${new Date(evento.fechaevento).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
⏰ *Hora:* ${evento.horaevento || 'No especificada'}

¡No te lo pierdas!
      `;
      
      // Enviamos el mensaje al usuario con formato Markdown
      await bot.sendMessage(chatId, detallesMensaje, { parse_mode: 'Markdown' });

    } catch (error) {
      // --- MANEJO DE ERRORES ---
      // Si algo falla dentro del bloque 'try', lo capturamos aquí.

      // 1. Mostramos el error en la consola del servidor para poder depurarlo.
      console.error(`[BOT] ¡ERROR! Al obtener detalles del evento ${eventoId}:`, error.message);
      
      // 2. Enviamos un mensaje de error genérico al usuario para que sepa que algo salió mal.
      await bot.sendMessage(chatId, '❌ Hubo un problema al obtener los detalles del evento. Por favor, inténtalo de nuevo más tarde.');
    }
  }
  
  // Aquí podrías añadir más 'if' para manejar otros tipos de callbacks en el futuro
  // if (data.startsWith('otro_callback_')) { ... }
});


async function getEventosFromAPI() {
  try {
    const response = await axios.get(`${API_BASE_URL}/eventos`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener eventos de la API:', error.message);
    return [];
  }
}

async function getEventoDetails(eventoId) {
  try {
    // CORRECCIÓN: Se debe usar axios.get
    const response = await axios.get(`${API_BASE_URL}/eventos/${eventoId}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener detalles del evento ${eventoId}:`, error.message);
    return null;
  }
}

}