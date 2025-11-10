// Importa as dependências necessárias do Firebase e do SendGrid.
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

// Inicializa o Firebase Admin SDK para permitir que a função acesse o Firestore.
admin.initializeApp();

// --- INÍCIO DA CONFIGURAÇÃO - O USUÁRIO DEVE ALTERAR NO FIREBASE ---
// Define a chave da API do SendGrid.
// IMPORTANTE: Substitua "SUA_CHAVE_API_SENDGRID" pela sua chave real nas configurações do Firebase.
const SENDGRID_API_KEY = functions.config().sendgrid.key;
if (!SENDGRID_API_KEY) {
  console.error("Chave de API do SendGrid não configurada. Defina-a com 'firebase functions:config:set sendgrid.key=SUA_CHAVE_API'");
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Define os destinatários e o remetente do e-mail.
// IMPORTANTE: Configure os e-mails de destino nas configurações do Firebase.
const TO_EMAILS = "contato@medmais.med.br, carla@medmais.med.br, vinicius@medmais.med.br";
const FROM_EMAIL = "vinicius@medmais.med.br";
// --- FIM DA CONFIGURAÇÃO ---

/**
 * Cloud Function que é acionada na criação de uma nova proposta.
 * A função escuta a coleção 'publicArtifacts/{appId}/proposals'.
 * Quando um novo documento é adicionado, esta função envia um e-mail.
 */
exports.sendProposalNotification = functions.firestore
    .document("publicArtifacts/{appId}/proposals/{proposalId}")
    .onCreate(async (snap, context) => {
      // Verifica se a chave da API do SendGrid foi configurada. Se não, interrompe a execução.
      if (!SENDGRID_API_KEY) {
        console.error("A execução foi interrompida porque a chave da API do SendGrid não está configurada.");
        return null;
      }

      // Obtém os dados da proposta recém-criada.
      const proposalData = snap.data();
      const clientData = proposalData.clientData || {};
      const clientName = clientData.clientName || "Cliente não informado";
      const clientEmail = clientData.clientEmail || "E-mail não informado";
      const clientPhone = clientData.clientPhone || "Telefone não informado";

      console.log(`Nova proposta recebida de: ${clientName}. Preparando notificação...`);

      // Define o conteúdo do e-mail.
      const msg = {
        to: TO_EMAILS.split(',').map(email => email.trim()),
        from: {
          name: "Sistema MedMais Propostas",
          email: FROM_EMAIL,
        },
        subject: "Nova Solicitação de Proposta Recebida!",
        html: `
          <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
            <h2 style="color: #0891b2;">Olá, Equipe de Vendas!</h2>
            <p>Uma nova solicitação de proposta foi recebida através do site.</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <h3 style="color: #333;">Detalhes do Cliente:</h3>
            <ul>
              <li><strong>Nome da Empresa:</strong> ${clientName}</li>
              <li><strong>E-mail de Contato:</strong> ${clientEmail}</li>
              <li><strong>Telefone:</strong> ${clientPhone}</li>
            </ul>
            <p>Por favor, acesse o painel de propostas para visualizar todos os detalhes e dar continuidade ao atendimento.</p>
            <p style="margin-top: 25px; font-size: 12px; color: #888;">
              Esta é uma mensagem automática. Não é necessário respondê-la.
            </p>
          </div>
        `,
      };

      // Tenta enviar o e-mail usando o SendGrid.
      try {
        console.log(`Enviando e-mail para: ${TO_EMAILS}`);
        await sgMail.send(msg);
        console.log("E-mail de notificação enviado com sucesso!");
        return null;
      } catch (error) {
        console.error("Erro ao enviar o e-mail de notificação:", error);

        // Se houver um erro mais detalhado na resposta da API, ele será logado.
        if (error.response) {
          console.error("Detalhes do erro:", error.response.body);
        }
        return null;
      }
    });
