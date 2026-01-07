import express from "express";
import cors from "cors";
import mercadopago from "mercadopago";

const app = express();
app.use(cors());
app.use(express.json());

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

app.post("/gerar-pix", async (req, res) => {
  try {
    const pagamento = await mercadopago.payment.create({
      transaction_amount: 10,
      description: "Acesso VIP Lábia Extrema",
      payment_method_id: "pix",
      payer: {
        email: `user${Date.now()}@email.com`
      }
    });

    const data = pagamento.body.point_of_interaction.transaction_data;

    res.json({
      paymentId: pagamento.body.id, // 👈 MUITO IMPORTANTE
      qr: data.qr_code,
      qrBase64: data.qr_code_base64
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao gerar PIX" });
  }
});

// ===== NOVO MÉTODO: PAGUE COM 1 CLIQUE =====
app.post("/criar-pagamento", async (req, res) => {
  try {
    const preference = {
      items: [
        {
          title: "Acesso VIP Lábia Extrema",
          quantity: 1,
          unit_price: 10
        }
      ],
      back_urls: {
         success: "https://labiaaextrema.netlify.app/vip.html",
         failure: "https://labiaaextrema.netlify.app/vip.html",
         pending: "https://labiaaextrema.netlify.app/vip.html"
  },
    auto_return: "approved"
    };

    const response = await mercadopago.preferences.create(preference);

    res.json({
      init_point: response.body.init_point
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar pagamento" });
  }
});

app.get("/status/:id", async (req, res) => {
  try {
    const paymentId = req.params.id;

    const pagamento = await mercadopago.payment.get(paymentId);

    res.json({
      status: pagamento.body.status
    });

  } catch (e) {
    res.status(500).json({ error: "Erro ao consultar pagamento" });
  }
});

// ===== STATUS MERCADO PAGO (1 CLIQUE) =====
app.get("/status-mp/:id", async (req, res) => {
  try {
    const paymentId = req.params.id;
    const pagamento = await mercadopago.payment.get(paymentId);

    if (pagamento.body.status === "approved") {
      return res.json({ aprovado: true });
    }

    return res.json({ aprovado: false });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: true });
  }
});

// ===== RETORNO DO MERCADO PAGO (DESATIVADO) =====
/*
app.get("/retorno", async (req, res) => {
  const paymentId = req.query.payment_id;

  if (!paymentId) {
    return res.redirect("/erro");
  }

  try {
    const pagamento = await mercadopago.payment.get(paymentId);

    if (pagamento.body.status === "approved") {
      return res.redirect("/index.html?vip=true");
    }

    return res.redirect("/erro");

  } catch (e) {
    console.error(e);
    return res.redirect("/erro");
  }
});
*/


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta", PORT));
