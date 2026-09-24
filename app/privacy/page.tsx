"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Database, LockKeyhole, ShieldCheck } from "lucide-react";
import "./privacy.css";

const sections = [
  { id:"dados", number:"01", title:"Dados que tratamos", body:"Para oferecer o SpeakFlow, podemos tratar dados de cadastro e conta, como nome e e-mail; preferências de aprendizagem; nível de inglês; foto de perfil quando enviada; registros de sessões; progresso; feedbacks, insights e dados de uso necessários para operar e melhorar a experiência. Também podemos tratar informações técnicas essenciais à segurança, autenticação e funcionamento do serviço." },
  { id:"finalidades", number:"02", title:"Por que usamos esses dados", body:"Usamos dados para autenticar sua conta, personalizar sua jornada de aprendizagem, manter seu progresso, gerar feedbacks e recomendações, operar recursos de inteligência artificial, prevenir abuso e falhas, prestar suporte, proteger a plataforma e cumprir obrigações legais aplicáveis. Procuramos limitar o tratamento ao que seja adequado e necessário para cada finalidade." },
  { id:"ia", number:"03", title:"Inteligência artificial e aprendizagem", body:"Interações realizadas nos recursos de aprendizagem podem ser processadas para produzir respostas, correções, resumos, recomendações e outros recursos personalizados. O SpeakFlow pode manter informações derivadas dessas interações, como sessões, habilidades praticadas, insights e planos de aprendizagem, quando isso for necessário para oferecer continuidade à experiência." },
  { id:"voz", number:"04", title:"Voz, áudio e pronúncia", body:"Alguns recursos permitem entrada ou reprodução de voz. Dependendo do recurso e do navegador, fala pode ser convertida em texto por tecnologias de reconhecimento disponíveis no dispositivo ou navegador, e texto pode ser enviado a serviços de voz para gerar áudio. O SpeakFlow deve tratar apenas os dados necessários para executar esses recursos e não apresenta análise acústica como algo que não realiza." },
  { id:"fornecedores", number:"05", title:"Fornecedores e compartilhamento", body:"Podemos utilizar prestadores de infraestrutura e tecnologia para autenticação, banco de dados, hospedagem, inteligência artificial, voz e processamento de pagamentos. Esses fornecedores recebem somente os dados necessários para executar suas funções, sujeitos às respectivas condições e medidas de proteção. Não vendemos dados pessoais como modelo de negócio." },
  { id:"pagamentos", number:"06", title:"Pagamentos e assinaturas", body:"As assinaturas pagas do SpeakFlow serão processadas pelo Mercado Pago. O SpeakFlow poderá receber e armazenar identificadores e estados necessários para reconhecer uma assinatura e liberar o plano correspondente, como referência da assinatura, status e período aplicável. Credenciais privadas e dados sensíveis de pagamento não devem ser expostos no cliente do SpeakFlow; o processamento financeiro segue também as práticas e políticas do provedor de pagamento." },
  { id:"armazenamento", number:"07", title:"Armazenamento local e tecnologias essenciais", body:"O SpeakFlow pode utilizar armazenamento do navegador e tecnologias equivalentes para manter preferências, estado da interface e progresso de determinados recursos. Quando tecnologias adicionais que exijam escolha do usuário forem adotadas, esta Política e os controles correspondentes deverão ser atualizados." },
  { id:"retencao", number:"08", title:"Retenção e segurança", body:"Mantemos dados pelo período necessário às finalidades descritas, à continuidade da conta e ao cumprimento de obrigações aplicáveis. Adotamos controles técnicos e organizacionais compatíveis com a natureza do serviço, incluindo autenticação, controles de acesso e separação de credenciais privadas. Nenhum sistema conectado à internet pode prometer risco zero." },
  { id:"direitos", number:"09", title:"Seus direitos de privacidade", body:"Nos termos da legislação aplicável, você pode solicitar informações sobre o tratamento de seus dados e, quando cabível, confirmação e acesso, correção, eliminação ou anonimização de dados inadequados ou excessivos, informações sobre compartilhamento, portabilidade nos termos da regulamentação, oposição, revogação de consentimento e revisão de determinadas decisões automatizadas. Algumas solicitações podem estar sujeitas a hipóteses legais de conservação ou outras limitações previstas em lei." },
  { id:"menores", number:"10", title:"Crianças e adolescentes", body:"A proteção de crianças e adolescentes exige cuidado adicional. Quando o SpeakFlow tratar dados pessoais desse público, o melhor interesse da criança ou do adolescente deverá prevalecer. Os fluxos de cadastro, consentimento, assistência ou representação e os recursos disponibilizados devem observar a legislação aplicável e ser apresentados de forma clara e acessível." },
  { id:"contato", number:"11", title:"Solicitações e contato", body:"Antes do lançamento comercial, o SpeakFlow disponibilizará neste espaço um canal oficial de privacidade para solicitações relacionadas a dados pessoais. Solicitações poderão exigir confirmação razoável de identidade para proteger a conta e evitar divulgação indevida de informações." },
  { id:"mudancas", number:"12", title:"Atualizações desta Política", body:"Esta Política poderá ser atualizada para refletir mudanças no produto, em fornecedores, na legislação ou nas práticas de privacidade. Quando uma alteração for relevante, adotaremos uma forma adequada de comunicação e manteremos a data da versão atual nesta página." },
];

export default function PrivacyPage(){
 const router=useRouter();
 return <main className="privacy-shell">
   <header className="privacy-topbar">
     <button type="button" className="privacy-back" onClick={()=>router.push("/")}><ArrowLeft/> Início</button>
     <div className="privacy-brand"><img src="/speakflow-logo.png" alt="SpeakFlow"/><div><strong>Speak<span>Flow</span></strong><small>PRIVACIDADE</small></div></div>
     <div className="privacy-spacer" aria-hidden="true"/>
   </header>

   <section className="privacy-hero">
     <span>PRIVACIDADE · TRANSPARÊNCIA · CONTROLE</span>
     <h1>Seus dados merecem<br/><em>clareza e respeito.</em></h1>
     <p>Esta Política explica, em linguagem direta, como o SpeakFlow trata dados pessoais para oferecer uma experiência de aprendizagem segura, personalizada e confiável.</p>
     <div className="privacy-meta"><span>Versão: 24 de setembro de 2026</span><span>Brasil · LGPD</span></div>
   </section>

   <section className="privacy-principles" aria-label="Princípios de privacidade">
     <article><ShieldCheck/><div><strong>Privacidade desde o produto</strong><p>Proteção considerada na arquitetura e nas decisões do SpeakFlow.</p></div></article>
     <article><Database/><div><strong>Dados com propósito</strong><p>Tratamento vinculado à experiência, segurança e operação do serviço.</p></div></article>
     <article><LockKeyhole/><div><strong>Acesso controlado</strong><p>Credenciais privadas e operações sensíveis permanecem no backend.</p></div></article>
   </section>

   <section className="privacy-layout">
     <aside><span>NESTA POLÍTICA</span>{sections.map(s=><a key={s.id} href={"#"+s.id}>{s.number} · {s.title}</a>)}</aside>
     <div className="privacy-content">
       <div className="privacy-intro"><strong>Política de Privacidade do SpeakFlow</strong><p>Esta página descreve as práticas planejadas e atuais do SpeakFlow. Recursos ainda em implantação, como assinaturas pagas, passam a integrar efetivamente o tratamento quando forem ativados.</p></div>
       {sections.map(s=><article id={s.id} key={s.id}><span>{s.number}</span><h2>{s.title}</h2><p>{s.body}</p></article>)}
       <div className="privacy-note"><strong>Nota de transparência</strong><p>Este documento deve acompanhar a evolução real do produto. Antes da disponibilização comercial, dados do responsável pelo tratamento e um canal oficial de privacidade devem ser confirmados e publicados.</p></div>
     </div>
   </section>

   <footer className="privacy-footer"><div><img src="/speakflow-logo.png" alt=""/><strong>Speak<span>Flow</span></strong></div><p>© 2026 SpeakFlow. Privacidade é parte da experiência.</p></footer>
 </main>
}
