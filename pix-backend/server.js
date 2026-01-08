import express from "express";
import cors from "cors";
import mercadopago from "mercadopago";

const app = express();
app.use(cors());
app.use(express.json());

// ===============================
// VARIÁVEIS
// ===============================
let conteudos = {};
let metrics = {
  visits: [],
  vipUsers: 0,
  totalTime: 0,
  sessions: 0
};

app.post("/track", (req, res) => {
  const { isVIP, timeSpent } = req.body;

  metrics.visits.push({
    date: new Date().toISOString().slice(0,10),
    time: Date.now()
  });

  metrics.sessions++;
  metrics.totalTime += timeSpent || 0;

  if (isVIP) metrics.vipUsers++;

  res.json({ ok: true });
});

app.get("/metrics", (req, res) => {
  if (req.headers["x-admin-token"] !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: "Não autorizado" });
  }

  const today = new Date().toISOString().slice(0,10);
  const weekAgo = Date.now() - 7*86400000;

  res.json({
    total: metrics.visits.length,
    today: metrics.visits.filter(v => v.date === today).length,
    week: metrics.visits.filter(v => v.time >= weekAgo).length,
    vip: metrics.vipUsers,
    avgTime: metrics.sessions
      ? Math.floor(metrics.totalTime / metrics.sessions)
      : 0
  });
});

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

// ===============================
// MERCADO PAGO
// ===============================
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

// ===== SALVAR CONTEÚDO POR TÓPICO (ADMIN)
app.post("/conteudo", (req, res) => {
  if (req.headers["x-admin-token"] !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: "Não autorizado" });
  }

  const { topic, texto } = req.body;

  if (topic === undefined || !texto) {
    return res.status(400).json({ error: "Dados inválidos" });
  }

  conteudos[topic] = texto;
  res.json({ ok: true });
});

// ===== LER CONTEÚDO (SITE)
app.get("/conteudo", (req, res) => {
  res.json({ messages: conteudos });
});

// ===============================
// PIX
// ===============================
app.post("/gerar-pix", async (req, res) => {
  try {
    const pagamento = await mercadopago.payment.create({
      transaction_amount: 10,
      description: "Acesso VIP Lábia Extrema",
      payment_method_id: "pix",
      payer: { email: `user${Date.now()}@email.com` }
    });

    const data = pagamento.body.point_of_interaction.transaction_data;

    res.json({
      paymentId: pagamento.body.id,
      qr: data.qr_code,
      qrBase64: data.qr_code_base64
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao gerar PIX" });
  }
});

// ===============================
// PAGAMENTO 1 CLIQUE
// ===============================
app.post("/criar-pagamento", async (req, res) => {
  try {
    const preference = {
      items: [{
        title: "Acesso VIP Lábia Extrema",
        quantity: 1,
        unit_price: 10
      }],
      back_urls: {
        success: "https://labiaaextrema.netlify.app/vip.html",
        failure: "https://labiaaextrema.netlify.app/vip.html",
        pending: "https://labiaaextrema.netlify.app/vip.html"
      },
      auto_return: "approved"
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ init_point: response.body.init_point });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar pagamento" });
  }
});

// ===============================
// STATUS PAGAMENTO
// ===============================
app.get("/status/:id", async (req, res) => {
  try {
    const pagamento = await mercadopago.payment.get(req.params.id);
    res.json({ status: pagamento.body.status });
  } catch (e) {
    res.status(500).json({ error: true });
  }
});

// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("🔥 Backend rodando na porta", PORT)
);
