// Este arquivo é o único ponto que falta conectar a um provedor de e-mail/SMS de verdade
// (ex: Resend, SendGrid, Twilio). Por enquanto ele só registra no log do servidor —
// assim você já pode testar o fluxo de aprovação sem depender de outra conta configurada.

async function enviarCredencialAcesso({ pagador, senhaTemp }) {
  console.log('----------------------------------------------------');
  console.log(`Credencial de acesso para ${pagador.nome} (${pagador.email})`);
  console.log(`CPF de login: ${pagador.cpf}`);
  console.log(`Senha temporária: ${senhaTemp}`);
  console.log('TODO: plugar aqui o envio real por e-mail/SMS.');
  console.log('----------------------------------------------------');

  // Exemplo de como ficaria com um provedor de e-mail (Resend):
  //
  // await fetch('https://api.resend.com/emails', {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     from: 'VH Soccer <matriculas@vhsoccer.com.br>',
  //     to: pagador.email,
  //     subject: 'Seu acesso ao painel VH Soccer',
  //     html: `Sua matrícula foi aprovada! Acesse com o CPF ${pagador.cpf} e a senha temporária ${senhaTemp}.`,
  //   }),
  // });
}

module.exports = { enviarCredencialAcesso };
