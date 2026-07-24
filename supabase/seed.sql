-- seed.sql
-- Use this file to migrate the existing bugs into the database safely.

DO $$
DECLARE
    issue1_id UUID := '11111111-1111-1111-1111-111111111111';
    issue2_id UUID := '22222222-2222-2222-2222-222222222222';
    issue3_id UUID := '33333333-3333-3333-3333-333333333333';
    issue4_id UUID := '44444444-4444-4444-4444-444444444444';
    issue5_id UUID := '55555555-5555-5555-5555-555555555555';
    issue6_id UUID := '66666666-6666-6666-6666-666666666666';
    issue7_id UUID := '77777777-7777-7777-7777-777777777777';
BEGIN
    -- Only insert if the table is empty to avoid duplication
    IF (SELECT COUNT(*) FROM public.issues) = 0 THEN

        INSERT INTO public.issues (id, issue_number, title, description, current_behavior, expected_behavior, reproduction_steps, client, category, priority, status)
        VALUES 
        (
            issue1_id, 1,
            'Inconsistência na Interface de Comércio com NPCs',
            'Ao fechar um container, como uma mochila ou janela de inventário, a janela de comércio com o NPC deixa de abrir ou responder corretamente.\n\nParticularidade: O comportamento é intermitente e ocorre exclusivamente no Astra Client. Nos demais clientes, a funcionalidade opera normalmente.',
            'Depois que um container é fechado, o sistema de trade do NPC pode deixar de responder.',
            'Fechar um container não deve interferir na abertura ou utilização da janela de comércio do NPC.',
            '1. Abra a janela de trade com um NPC.\n2. Abra um container (ex: mochila).\n3. Feche o container.\n4. Tente interagir com a janela de trade do NPC.',
            'Astra Client', 'Trade / Interface', 'Alta', 'Reportado'
        ),
        (
            issue2_id, 2,
            'Falha de Privacidade no Canal de Fala dos NPCs',
            'Quando um jogador inicia uma conversa com um NPC, as mensagens enviadas pelo NPC não ficam restritas ao jogador em atendimento.',
            'Outros jogadores próximos conseguem visualizar todo o diálogo entre o NPC e o jogador.',
            'As mensagens privadas do NPC devem ser enviadas somente ao jogador que iniciou a conversa, salvo quando a mensagem for intencionalmente pública.',
            '',
            'Todos os clientes', 'NPC / Protocolo', 'Alta', 'Reportado'
        ),
        (
            issue3_id, 3,
            'Restauração do Protocolo de Organização de Outfits',
            'O código responsável pela ordenação e estruturação dos outfits foi alterado, removido ou perdido durante modificações recentes.',
            'A lista ou estrutura dos outfits pode ser enviada em ordem incorreta ou incompatível com o cliente.',
            'Restaurar o protocolo original de organização dos outfits, preservando a ordem, addons, mounts, frame groups e demais informações suportadas.',
            '',
            'Servidor / Astra Client', 'Outfit / Protocolo', 'Média', 'Em análise'
        ),
        (
            issue4_id, 4,
            'Remoção de Código Redundante sanitizeOutfit',
            'A função ou filtro sanitizeOutfit encontra-se obsoleto e não oferece uma função prática ou proteção efetiva no estado atual do projeto.',
            'A função adiciona uma camada desnecessária de processamento e aumenta a complexidade do código.',
            'Remover sanitizeOutfit, revisar todos os pontos de uso e garantir que a remoção não cause regressões no protocolo de outfits.',
            '',
            'Servidor', 'Refatoração', 'Baixa', 'Em análise'
        ),
        (
            issue5_id, 5,
            'Escrita Fora dos Limites via Lua no Player',
            'Foi identificada uma possível escrita fora dos limites de memória (Out-of-Bounds Write) durante uma operação executada via Lua envolvendo um objeto Player.\n\nObservação: Bug informado por outro desenvolvedor. Ainda precisa ser reproduzido e testado detalhadamente.',
            'Uma chamada Lua pode acessar ou escrever em uma região inválida de memória relacionada ao Player, causando corrupção de memória, comportamento imprevisível ou crash do servidor.',
            'Todas as operações Lua relacionadas ao Player devem validar índices, ponteiros, tamanhos e estado do objeto antes de realizar qualquer escrita.',
            '',
            'Servidor', 'Segurança', 'Crítica', 'Reportado'
        ),
        (
            issue6_id, 6,
            'Use-After-Free no ProtocolAdmin',
            'Foi identificado um possível Use-After-Free no ProtocolAdmin, no qual uma instância ou referência pode continuar sendo utilizada depois que o objeto já foi destruído.\n\nObservação: Bug informado por outro desenvolvedor. Ainda precisa de reprodução, stack trace e validação do ciclo de vida do objeto.',
            'O ProtocolAdmin pode acessar memória pertencente a um objeto já liberado, causando crash, corrupção de memória ou comportamento indefinido.',
            'Toda operação pendente, callback, task ou referência ligada ao ProtocolAdmin deve ser cancelada ou invalidada antes da destruição do objeto.',
            '',
            'Servidor', 'Protocolo', 'Crítica', 'Reportado'
        ),
        (
            issue7_id, 7,
            'Invalidação de Iterador em Monster::searchTarget',
            'Foi identificada uma possível invalidação de iterador dentro da função Monster::searchTarget durante a busca ou alteração da lista de alvos.\n\nObservação: Bug informado por outro desenvolvedor. O problema ainda não foi testado completamente por falta de tempo. Revisar todas as chamadas que podem modificar a lista durante a iteração.',
            'A coleção utilizada por Monster::searchTarget pode ser modificada enquanto está sendo percorrida, invalidando o iterador atual e podendo causar crash ou comportamento indefinido.',
            'A função deve percorrer a coleção de forma segura, sem remover, adicionar ou reorganizar elementos enquanto um iterador inválido ainda estiver em uso.',
            '',
            'Servidor', 'Performance', 'Alta', 'Reportado'
        );

        -- Insert Tags
        INSERT INTO public.issue_tags (issue_id, tag) VALUES
        (issue1_id, 'npc'), (issue1_id, 'trade'), (issue1_id, 'container'), (issue1_id, 'astra-client'), (issue1_id, 'interface'),
        (issue2_id, 'npc'), (issue2_id, 'chat'), (issue2_id, 'privacidade'), (issue2_id, 'escopo'), (issue2_id, 'protocolo'),
        (issue3_id, 'outfit'), (issue3_id, 'protocolo'), (issue3_id, 'organização'), (issue3_id, 'addons'), (issue3_id, 'mounts'),
        (issue4_id, 'sanitizeOutfit'), (issue4_id, 'refatoração'), (issue4_id, 'código-morto'), (issue4_id, 'outfit'),
        (issue5_id, 'lua'), (issue5_id, 'player'), (issue5_id, 'out-of-bounds'), (issue5_id, 'oob-write'), (issue5_id, 'memory-corruption'), (issue5_id, 'crash'),
        (issue6_id, 'protocoladmin'), (issue6_id, 'use-after-free'), (issue6_id, 'uaf'), (issue6_id, 'memory-safety'), (issue6_id, 'crash'), (issue6_id, 'protocol'),
        (issue7_id, 'monster'), (issue7_id, 'searchTarget'), (issue7_id, 'iterator-invalidation'), (issue7_id, 'target'), (issue7_id, 'crash'), (issue7_id, 'memory-safety');

    END IF;
END $$;
