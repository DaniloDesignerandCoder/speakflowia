import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RAW_HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "";
const HOOK_SECRET = RAW_HOOK_SECRET.replace("v1,whsec_", "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const LOGO_URL = "https://speakflow.speakflowia.workers.dev/speakflow-logo.png";

type HookPayload = {
  user: { email?: string };
  email_data: { token_hash: string; redirect_to: string; email_action_type: string };
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char] ?? char));
}

function actionUrl(data: HookPayload["email_data"]) {
  return `${SUPABASE_URL}/auth/v1/verify?token=${encodeURIComponent(data.token_hash)}&type=${encodeURIComponent(data.email_action_type)}&redirect_to=${encodeURIComponent(data.redirect_to)}`;
}

function copyFor(actionType: string) {
  switch (actionType) {
    case "signup":
      return { subject:"Confirme seu e-mail | SpeakFlow", eyebrow:"Bem-vindo ao SpeakFlow", title:"Confirme seu e-mail", intro:"Falta apenas um passo para ativar sua conta e começar sua jornada de aprendizado com o SpeakFlow.", button:"Confirmar minha conta" };
    case "recovery":
      return { subject:"Redefina sua senha | SpeakFlow", eyebrow:"Segurança da conta", title:"Redefina sua senha", intro:"Recebemos uma solicitação para redefinir a senha da sua conta SpeakFlow.", button:"Redefinir minha senha" };
    case "magiclink":
      return { subject:"Seu acesso ao SpeakFlow", eyebrow:"Acesso seguro", title:"Entre no SpeakFlow", intro:"Use o botão abaixo para entrar com segurança na sua conta SpeakFlow.", button:"Entrar no SpeakFlow" };
    case "email_change":
      return { subject:"Confirme seu novo e-mail | SpeakFlow", eyebrow:"Segurança da conta", title:"Confirme seu novo e-mail", intro:"Confirme este endereço para concluir a alteração do e-mail da sua conta SpeakFlow.", button:"Confirmar novo e-mail" };
    case "invite":
      return { subject:"Você foi convidado para o SpeakFlow", eyebrow:"Convite SpeakFlow", title:"Seu convite chegou", intro:"Use o botão abaixo para aceitar o convite e continuar no SpeakFlow.", button:"Aceitar convite" };
    default:
      return { subject:"Confirme sua ação | SpeakFlow", eyebrow:"SpeakFlow", title:"Confirme sua ação", intro:"Use o botão abaixo para concluir com segurança esta solicitação da sua conta SpeakFlow.", button:"Continuar no SpeakFlow" };
  }
}

function renderEmail(actionType: string, url: string) {
  const c = copyFor(actionType);
  const safeUrl = escapeHtml(url);
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#070b14;font-family:Arial,Helvetica,sans-serif;color:#fff">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#070b14"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;background:#0b1220;border:1px solid #182235;border-radius:20px">
<tr><td align="center" style="padding:42px 32px 20px"><img src="${LOGO_URL}" alt="SpeakFlow" width="170" style="display:block;width:170px;max-width:70%;height:auto;border:0"><div style="margin-top:10px;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.2px">Speak<span style="color:#6f8cff">Flow</span></div></td></tr>
<tr><td align="center" style="padding:10px 36px 0"><div style="display:inline-block;padding:6px 10px;border:1px solid #263553;border-radius:999px;color:#8197ff;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">${c.eyebrow}</div>
<h1 style="margin:22px 0 12px;font-size:28px;line-height:1.2;font-weight:700;color:#fff">${c.title}</h1>
<p style="margin:0 auto;max-width:430px;color:#9ca8bd;font-size:15px;line-height:1.7">${c.intro}</p></td></tr>
<tr><td align="center" style="padding:30px 36px 28px"><a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:15px 28px;border-radius:11px">${c.button}</a></td></tr>
<tr><td style="padding:0 36px"><div style="height:1px;background:#182235;font-size:1px;line-height:1px">&nbsp;</div></td></tr>
<tr><td align="center" style="padding:25px 36px 36px"><p style="margin:0 0 8px;color:#7f8ba0;font-size:12px;line-height:1.6">Esta mensagem foi enviada por uma solicitação de autenticação do SpeakFlow.</p>
<p style="margin:0;color:#59657a;font-size:11px;line-height:1.6">Se você não iniciou esta solicitação, pode ignorar esta mensagem.</p>
<p style="margin:24px 0 0;color:#4e5a70;font-size:10px;letter-spacing:.4px">SPEAKFLOW · INGLÊS GUIADO POR IA</p></td></tr></table></td></tr></table></body></html>`;
  return { subject:c.subject, html };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status:405 });
  if (!RESEND_API_KEY || !HOOK_SECRET || !SUPABASE_URL) {
    console.error("Missing email hook configuration.");
    return new Response(JSON.stringify({error:{message:"Email service unavailable."}}), {status:500,headers:{"Content-Type":"application/json"}});
  }
  const payload = await req.text();
  try {
    const verified = new Webhook(HOOK_SECRET).verify(payload, Object.fromEntries(req.headers)) as HookPayload;
    const email = verified.user?.email;
    if (!email) throw new Error("Missing recipient email.");
    const actionType = verified.email_data.email_action_type;\n    console.log("Send email hook action:", actionType);\n    const { subject, html } = renderEmail(actionType, actionUrl(verified.email_data));
    const response = await fetch("https://api.resend.com/emails", {
      method:"POST",
      headers:{Authorization:`Bearer ${RESEND_API_KEY}`,"Content-Type":"application/json"},
      body:JSON.stringify({from:"SpeakFlow <onboarding@resend.dev>",to:[email],subject,html}),
    });
    if (!response.ok) {
      console.error("Resend rejected email:", response.status, await response.text());
      throw new Error("Email provider rejected request.");
    }
    return new Response("{}", {status:200,headers:{"Content-Type":"application/json"}});
  } catch (error) {
    console.error("Send email hook rejected:", error instanceof Error ? error.message : "unknown error");
    return new Response(JSON.stringify({error:{message:"Invalid email hook request."}}), {status:401,headers:{"Content-Type":"application/json"}});
  }
});