import { baixarArquivoCSV } from '@/lib/parserPlanilha'

/**
 * Modelos prontos para download imediato (Templates de importação)
 */

export const MODELO_CANDIDATOS_CABECALHOS = [
  'Nome Completo',
  'E-mail',
  'Telefone',
  'Vaga de Interesse',
  'Estágio no Funil',
  'Canal de Origem',
  'Data de Contratação',
  'Cargo Atual',
  'Empresa Atual',
  'Cidade / UF',
  'LinkedIn',
  'Habilidades Técnicas',
  'Observações',
]

export const MODELO_CANDIDATOS_EXEMPLO = [
  {
    'Nome Completo': 'Mariana Souza Dias',
    'E-mail': 'mariana.dias.souza@exemplo.com.br',
    Telefone: '(11) 98765-4321',
    'Vaga de Interesse': 'Desenvolvedor(a) Backend Sênior',
    'Estágio no Funil': 'Triagem',
    'Canal de Origem': 'LinkedIn',
    'Cargo Atual': 'Engenheira de Software Backend',
    'Empresa Atual': 'Tech Finanças Brasil',
    'Cidade / UF': 'São Paulo, SP',
    LinkedIn: 'https://linkedin.com/in/mariana-dias-dev',
    'Habilidades Técnicas': 'Node.js, TypeScript, PostgreSQL, Docker, Go, Redis',
    Observações: 'Perfil forte em microsserviços e mensageria distribuída.',
  },
  {
    'Nome Completo': 'Rodrigo Peixoto Silveira',
    'E-mail': 'rodrigo.peixoto.silveira@exemplo.com.br',
    Telefone: '(21) 99876-1234',
    'Vaga de Interesse': 'Product Designer Pleno',
    'Estágio no Funil': 'Entrevista com RH',
    'Canal de Origem': 'Página de Carreira',
    'Cargo Atual': 'Product Designer',
    'Empresa Atual': 'Agência Criativa Digital',
    'Cidade / UF': 'Rio de Janeiro, RJ',
    LinkedIn: 'https://linkedin.com/in/rodrigo-design-ux',
    'Habilidades Técnicas': 'Figma, Design System, UX Research, Prototipação, Design Tokens',
    Observações: 'Excelente portfólio em B2B SaaS e sistemas de design.',
  },
  {
    'Nome Completo': 'Carolina Fagundes Neves',
    'E-mail': 'carolina.fagundes.neves@exemplo.com.br',
    Telefone: '(31) 97654-9870',
    'Vaga de Interesse': 'Analista de Marketing Digital',
    'Estágio no Funil': 'Triagem',
    'Canal de Origem': 'Indicação interna',
    'Cargo Atual': 'Coordenadora de Aquisição',
    'Empresa Atual': 'Varejo Online Express',
    'Cidade / UF': 'Belo Horizonte, MG',
    LinkedIn: 'https://linkedin.com/in/carol-marketing-performance',
    'Habilidades Técnicas': 'Google Ads, Meta Ads, GA4, SEO, Copywriting, Looker Studio',
    Observações: 'Indicação do time comercial com histórico comprovado em tráfego pago.',
  },
  {
    'Nome Completo': 'Felipe Albuquerque Prado',
    'E-mail': 'felipe.albuquerque.prado@exemplo.com.br',
    Telefone: '(41) 98123-5566',
    'Vaga de Interesse': 'Analista de Gente & Gestão',
    'Estágio no Funil': 'Entrevista técnica',
    'Canal de Origem': 'LinkedIn',
    'Data de Contratação': '',
    'Cargo Atual': 'Analista de R&S Pleno',
    'Empresa Atual': 'Consultoria Capital Humano',
    'Cidade / UF': 'Curitiba, PR',
    LinkedIn: 'https://linkedin.com/in/felipe-albuquerque-rh',
    'Habilidades Técnicas':
      'R&S Ponta a Ponta, Entrevista por Competências, People Analytics, Onboarding',
    Observações: 'Vivência em volume tech e metodologia ágil aplicada ao RH.',
  },
  {
    'Nome Completo': 'Beatriz Helena Amaral',
    'E-mail': 'beatriz.helena.amaral@exemplo.com.br',
    Telefone: '(19) 98222-3344',
    'Vaga de Interesse': 'Desenvolvedor(a) Backend Sênior',
    'Estágio no Funil': 'Match técnico/comportamental (IA)',
    'Canal de Origem': 'Banco de talentos',
    'Cargo Atual': 'Senior Backend Specialist',
    'Empresa Atual': 'Plataforma Cloud Global',
    'Cidade / UF': 'Campinas, SP',
    LinkedIn: 'https://linkedin.com/in/beatriz-amaral-backend',
    'Habilidades Técnicas': 'Go, Kubernetes, AWS, Node.js, RabbitMQ, Arquitetura Hexagonal',
    Observações: 'Candidata com nota 94 no matching técnico com perfil de liderança.',
  },
]

export const MODELO_VAGAS_CABECALHOS = [
  'Título da Vaga',
  'Departamento',
  'Modalidade',
  'Localização',
  'Faixa Salarial',
  'Orçamento Mensal',
  'Requisitos Obrigatórios',
  'Habilidades Técnicas',
  'Descrição do Cargo',
  'Status',
]

export const MODELO_VAGAS_EXEMPLO = [
  {
    'Título da Vaga': 'Engenheiro(a) de Dados Pleno',
    Departamento: 'Tecnologia',
    Modalidade: 'Remoto',
    Localização: 'São Paulo, SP (Remoto Nacional)',
    'Faixa Salarial': 'R$ 10.000 - R$ 13.000',
    'Orçamento Mensal': 13000,
    'Requisitos Obrigatórios':
      '3+ anos em engenharia de dados; pipelines em Python e SQL; vivência em Data Lakehouse (Snowflake ou Databricks)',
    'Habilidades Técnicas': 'Python, SQL, Spark, Airflow, Snowflake, AWS',
    'Descrição do Cargo':
      'Responsável por construir e monitorar pipelines de ETL/ELT robustos, governança de dados e modelagem analítica para People Analytics.',
    Status: 'Ativa',
  },
  {
    'Título da Vaga': 'Coordenador(a) de People Analytics & Atração',
    Departamento: 'Recursos Humanos',
    Modalidade: 'Híbrido',
    Localização: 'São Paulo, SP',
    'Faixa Salarial': 'R$ 12.000 - R$ 15.000',
    'Orçamento Mensal': 15000,
    'Requisitos Obrigatórios':
      'Experiência em liderança de equipe de R&S; domínio de indicadores (time-to-hire, turnover, custo por contratação); dashboards em Power BI',
    'Habilidades Técnicas':
      'People Analytics, Power BI, Gestão de Metas, R&S Estratégico, Legislação Trabalhista',
    'Descrição do Cargo':
      'Liderar a operação de recrutamento estratégico e implantação da cultura orientada a dados em Gente & Gestão.',
    Status: 'Ativa',
  },
]

export function baixarModeloCandidatos(incluirExemplos: boolean = true) {
  baixarArquivoCSV(
    incluirExemplos
      ? 'modelo_candidatos_souyess_preenchido.csv'
      : 'modelo_candidatos_souyess_vazio.csv',
    MODELO_CANDIDATOS_CABECALHOS,
    incluirExemplos ? MODELO_CANDIDATOS_EXEMPLO : [],
  )
}

export function baixarModeloVagas(incluirExemplos: boolean = true) {
  baixarArquivoCSV(
    incluirExemplos ? 'modelo_vagas_souyess_preenchido.csv' : 'modelo_vagas_souyess_vazio.csv',
    MODELO_VAGAS_CABECALHOS,
    incluirExemplos ? MODELO_VAGAS_EXEMPLO : [],
  )
}
