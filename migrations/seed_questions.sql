DELETE FROM question_sets WHERE id IN ('A001', 'A002');

INSERT OR REPLACE INTO question_sets (
  id,
  normal_question,
  impostor_question,
  category,
  active
)
VALUES
(
  'T001',
  'Chi è il più organizzato tra voi?',
  'Chi è quello con meno senso dell’orientamento tra voi?',
  'testuali',
  1
),
(
  'T002',
  'Se potessi mangiare un solo cibo per un mese, quale sceglieresti?',
  'Che cosa porteresti da mangiare a un primo appuntamento?',
  'testuali',
  1
),
(
  'T003',
  'Quale bevanda berresti ogni giorno?',
  'Quale bevanda hai smesso di bere di recente?',
  'testuali',
  1
),
(
  'T004',
  'Quale emoji ti rappresenta meglio?',
  'Qual è l’emoji più brutta che ti viene in mente?',
  'testuali',
  1
),
(
  'T005',
  'Quale materia viene solitamente insegnata da un bravo insegnante?',
  'Quale materia viene solitamente insegnata da un cattivo insegnante?',
  'testuali',
  1
),
(
  'T006',
  'Quale personaggio famoso sarebbe un pessimo coinquilino?',
  'Con quale personaggio famoso andresti in vacanza?',
  'testuali',
  1
),
(
  'T007',
  'Quale cibo non può mancare a una festa?',
  'Quale cibo è il tuo piacere proibito?',
  'testuali',
  1
),
(
  'T008',
  'Quale animale esotico riusciresti a battere in una lotta?',
  'Quale animale vorresti poter addomesticare?',
  'testuali',
  1
),
(
  'T009',
  'Qual è la cosa più inquietante che tu abbia mai visto o vissuto?',
  'Qual è la tua paura più grande?',
  'testuali',
  1
),
(
  'T010',
  'Chi tra voi avrebbe la casa più bella, se i soldi non contassero?',
  'Chi tra voi ha la casa più bella?',
  'testuali',
  1
),
(
  'T011',
  'Quale app usi più di tutte?',
  'Quale app ti infastidisce di più?',
  'testuali',
  1
),
(
  'T012',
  'In quale paese costruiresti la casa dei tuoi sogni?',
  'Quale meta sceglieresti per la tua prossima vacanza?',
  'testuali',
  1
),
(
  'T013',
  'Quale professione trovi attraente?',
  'Che lavoro fa tua madre?',
  'testuali',
  1
),
(
  'T014',
  'Qual è il primo aggettivo che ti viene in mente pensando a The Rock?',
  'Quale aggettivo ti rappresenta meglio?',
  'testuali',
  1
),
(
  'T015',
  'Qual è la materia scolastica che ritieni più utile?',
  'Qual è la materia scolastica peggiore che tu abbia mai studiato?',
  'testuali',
  1
),
(
  'T016',
  'Qual è la bevanda migliore per far passare una sbronza?',
  'Qual è la cosa migliore da bere dopo aver mangiato troppo?',
  'testuali',
  1
),
(
  'T017',
  'Quale serie TV consiglieresti in assoluto?',
  'Quale serie TV riguarderesti di nascosto?',
  'testuali',
  1
),
(
  'T018',
  'Quale celebrità non vorresti come membro della tua famiglia?',
  'Quale celebrità vorresti come partner del tuo migliore amico?',
  'testuali',
  1
),
(
  'T019',
  'Con quale aggettivo descriveresti i Minions?',
  'Qual è il primo aggettivo che ti viene in mente?',
  'testuali',
  1
),
(
  'T020',
  'Se potessi vivere in un videogioco, quale sceglieresti?',
  'Qual è il tuo videogioco preferito in assoluto?',
  'testuali',
  1
),
(
  'T021',
  'Quale animale descriverebbe meglio il tuo atteggiamento in una relazione?',
  'Quale animale descrive meglio il tuo partner?',
  'testuali',
  1
),
(
  'T022',
  'Qual è il nome di persona che ti piace di meno?',
  'Qual è il tuo nome di persona preferito?',
  'testuali',
  1
),
(
  'T023',
  'Qual è una cosa di cui non ti saresti aspettato di avere paura?',
  'Qual è una paura diffusa che, secondo te, non ha senso?',
  'testuali',
  1
),
(
  'T024',
  'Se potessi ascoltare una sola canzone per un anno, quale sceglieresti?',
  'Qual è la canzone che hai ascoltato di più l’anno scorso?',
  'testuali',
  1
),
(
  'T025',
  'Che cosa ti è piaciuto fare, contro ogni aspettativa?',
  'Qual è la cosa che tendi a procrastinare di più?',
  'testuali',
  1
),
(
  'T026',
  'Quale cibo mangeresti in questo momento?',
  'Quale cibo si può mangiare sia a colazione sia a cena?',
  'testuali',
  1
),
(
  'T027',
  'Quale aggettivo descrive la persona alla tua destra?',
  'Quale aggettivo descrive Bad Bunny?',
  'testuali',
  1
),
(
  'T028',
  'Qual era il tuo cartone animato preferito da piccolo?',
  'Qual è il cartone animato più sopravvalutato che guardavi da piccolo?',
  'testuali',
  1
),
(
  'T029',
  'In quale sport olimpico invernale pensi che saresti più bravo?',
  'Qual è lo sport olimpico invernale che non praticheresti mai?',
  'testuali',
  1
),
(
  'T030',
  'Se potessi essere un animale, quale saresti?',
  'Qual è l’animale con più aura in assoluto?',
  'testuali',
  1
),
(
  'T031',
  'Di chi tra voi vorresti vivere la vita per un giorno?',
  'Di chi tra voi non vorresti mai vivere la vita per un giorno?',
  'testuali',
  1
),
(
  'T032',
  'Qual è il miglior antipasto?',
  'Qual è l’antipasto più sopravvalutato?',
  'testuali',
  1
),
(
  'T033',
  'Qual è il peggior film della Pixar?',
  'Qual è il film Disney più sopravvalutato?',
  'testuali',
  1
),
(
  'T034',
  'Quale automobile compreresti se fossi famoso?',
  'Qual è stata la tua prima automobile?',
  'testuali',
  1
),
(
  'T035',
  'A quale celebrità scatteresti una foto per strada?',
  'Quale celebrità tratta meglio i propri fan?',
  'testuali',
  1
),
(
  'T036',
  'Qual è il posto peggiore in cui addormentarsi?',
  'Quale posto ti fa paura?',
  'testuali',
  1
),
(
  'T037',
  'Qual è il regalo migliore che tu abbia mai ricevuto?',
  'Che cosa compreresti a un amico con un budget di 500 euro?',
  'testuali',
  1
),
(
  'T038',
  'Quale personaggio dei cartoni animati ti sta più antipatico?',
  'Quale personaggio di SpongeBob ti viene in mente?',
  'testuali',
  1
),
(
  'T039',
  'Con chi andresti a cena se potessi scegliere chiunque?',
  'Quale personaggio importante della storia ti viene in mente?',
  'testuali',
  1
),
(
  'T040',
  'Qual è il tuo dolce preferito?',
  'Che cosa mangi normalmente a merenda?',
  'testuali',
  1
),
(
  'T041',
  'Qual è l’app più utile che hai sul telefono?',
  'Quale app usi più spesso?',
  'testuali',
  1
),
(
  'T042',
  'In quale paese andresti in vacanza d’inverno?',
  'Quale paese visiteresti in estate?',
  'testuali',
  1
),
(
  'T043',
  'Quale celebrità italiana vorresti conoscere?',
  'Quale influencer ritieni più sopravvalutato?',
  'testuali',
  1
),
(
  'T044',
  'Quale film non guarderesti di nuovo?',
  'Qual è l’ultimo film che hai visto?',
  'testuali',
  1
),
(
  'T045',
  'Quale dolce vorresti per il tuo compleanno?',
  'Quale dolce porteresti a un pranzo in famiglia?',
  'testuali',
  1
),
(
  'T046',
  'Quale vestito compreresti con un budget di 300 euro?',
  'Quale vestito indossi più spesso?',
  'testuali',
  1
),
(
  'T047',
  'Quale superpotere ti sarebbe più utile nella vita quotidiana?',
  'Quale potere dei supereroi Marvel ti entusiasma di più?',
  'testuali',
  1
),
(
  'T048',
  'Quale personaggio immaginario vorresti qui con voi in questo momento?',
  'Qual è il primo personaggio dei cartoni animati che ti viene in mente?',
  'testuali',
  1
),
(
  'T049',
  'Quale hobby vorresti iniziare l’anno prossimo?',
  'Quale abilità impareresti se avessi a disposizione un corso gratuito?',
  'testuali',
  1
),
(
  'T050',
  'Quale oggetto che possiedi ritieni indispensabile?',
  'Quale oggetto contemporaneo mostreresti a Napoleone?',
  'testuali',
  1
),
(
  'T051',
  'Quale oggetto inutile metteresti nella tua futura villa?',
  'Se avessi già tutto, che cosa compreresti per noia senza badare al budget?',
  'testuali',
  1
),
(
  'T052',
  'Qual è la stagione migliore per viaggiare?',
  'Quale stagione ti viene in mente per prima?',
  'testuali',
  1
),
(
  'T053',
  'Qual è il tuo colore preferito?',
  'Qual è il colore preferito della persona alla tua destra?',
  'testuali',
  1
),
(
  'T054',
  'Qual è il tuo gioco da tavolo preferito?',
  'Qual è il gioco da tavolo più sopravvalutato?',
  'testuali',
  1
),
(
  'T055',
  'In quale paese andresti per fare serata?',
  'In quale paese vorresti festeggiare il tuo prossimo compleanno?',
  'testuali',
  1
),
(
  'T056',
  'Quale condimento per un panino ritieni sottovalutato?',
  'Qual è l’ultima cosa che hai mangiato?',
  'testuali',
  1
),
(
  'T057',
  'In quale mondo immaginario vorresti trascorrere una settimana?',
  'Qual è la tua saga cinematografica preferita?',
  'testuali',
  1
),
(
  'T058',
  'Quale parola useresti per descrivere il lunedì mattina?',
  'Qual è la parola che ti piace di meno?',
  'testuali',
  1
),
(
  'T059',
  'Qual è il peggior soprannome da usare a un primo appuntamento?',
  'Come chiameresti il cane di un tuo amico, se potessi cambiargli il nome?',
  'testuali',
  1
),
(
  'T060',
  'Quale figura faresti realizzare in oro su una collana?',
  'Qual è l’animale che ti piace di più?',
  'testuali',
  1
),
(
  'T061',
  'Qual è la prima cosa che faresti se ti arrivassero cento milioni sul conto?',
  'Che cosa vorresti cambiare nel mondo?',
  'testuali',
  1
),
(
  'T062',
  'Che cosa faresti se diventassi improvvisamente cieco?',
  'Qual è la prima cosa che faresti se vedessi uno squalo?',
  'testuali',
  1
),
(
  'T063',
  'Qual è la tua parola preferita?',
  'Quale parola significa felicità per te?',
  'testuali',
  1
),
(
  'T064',
  'Quale accessorio ritieni sottovalutato su un uomo?',
  'Qual è il miglior accessorio per una donna?',
  'testuali',
  1
),
(
  'T065',
  'Per che cosa faresti tre ore di coda senza lamentarti?',
  'Qual è l’attività che ami ma pratichi troppo poco?',
  'testuali',
  1
),
(
  'T066',
  'Se ti facessero un regalo a sorpresa, che cosa spereresti che fosse?',
  'Qual è la prossima cosa che vuoi comprare?',
  'testuali',
  1
),
(
  'T067',
  'Se potessi viaggiare nel passato, che cosa cambieresti?',
  'Qual è la cosa più interessante che tu abbia studiato in storia?',
  'testuali',
  1
),
(
  'T068',
  'Se i tuoi genitori ti chiudessero in casa per un mese, che cosa avresti fatto per meritartelo?',
  'Qual è la cosa peggiore che tu abbia mai fatto?',
  'testuali',
  1
),
(
  'T069',
  'Che cosa faresti il giorno del giudizio?',
  'Che cosa faresti il lunedì mattina?',
  'testuali',
  1
),
(
  'N001',
  'Quanti tatuaggi hai?',
  'Quanti interventi hai fatto nella tua vita?',
  'numeriche',
  1
),
(
  'N002',
  'Quanti euro spendi al mese per i prodotti di bellezza?',
  'Quanto spendi al mese per le medicine?',
  'numeriche',
  1
),
(
  'N003',
  'Qual è l’età minima che ritieni accettabile per frequentare una persona?',
  'A che età pensi sia giusto iniziare una relazione seria?',
  'numeriche',
  1
),
(
  'N004',
  'Di quanti soldi avresti bisogno per essere a posto per il resto della tua vita?',
  'Quale numero sceglieresti tra centomila e dieci milioni?',
  'numeriche',
  1
),
(
  'N005',
  'Qual è la temperatura ideale?',
  'Quanti gradi pensi che ci siano in questo momento?',
  'numeriche',
  1
),
(
  'N006',
  'Quante volte alla settimana esci normalmente a cena?',
  'Quante volte al giorno ti lavi i denti?',
  'numeriche',
  1
),
(
  'N007',
  'Per quanti soldi interromperesti la tua amicizia più stretta?',
  'Quanti soldi pensi ti servirebbero per girare il mondo?',
  'numeriche',
  1
),
(
  'N008',
  'Quanti soldi ti basterebbero per vivere come vorresti?',
  'Quanti alberi pensi che ci siano, approssimativamente, in Austria?',
  'numeriche',
  1
),
(
  'N009',
  'Quale percentuale dei tuoi guadagni risparmi regolarmente?',
  'Quale percentuale di una vincita alla lotteria spenderesti per il tempo libero?',
  'numeriche',
  1
),
(
  'N010',
  'Quante volte ti lavi in un anno?',
  'Quante volte esci di casa in un anno?',
  'numeriche',
  1
),
(
  'N011',
  'Qual è l’altezza ideale per una ragazza?',
  'Quanto vorresti essere alto?',
  'numeriche',
  1
),
(
  'N012',
  'Quanti euro spendi al mese per libri e riviste?',
  'Quanti euro spendi in aperitivi al mese?',
  'numeriche',
  1
),
(
  'N013',
  'Quanti strumenti musicali possiedi?',
  'Quanti bagni hai in casa?',
  'numeriche',
  1
),
(
  'N014',
  'Quanti euro spendi al mese per i pranzi di lavoro?',
  'Quanto spendi al mese per la benzina?',
  'numeriche',
  1
),
(
  'N015',
  'Quante volte al mese cucini?',
  'Quante pizze mangi al mese?',
  'numeriche',
  1
),
(
  'N016',
  'Quanti cappelli possiedi?',
  'Quante stanze hai in casa?',
  'numeriche',
  1
),
(
  'N017',
  'Quante sere al mese esci?',
  'Quante volte al mese vai al supermercato?',
  'numeriche',
  1
),
(
  'N018',
  'Quante volte al mese passeggi al parco?',
  'Quante volte al mese ti alleni?',
  'numeriche',
  1
),
(
  'N019',
  'Quante automobili hai in casa?',
  'Quante lingue parli?',
  'numeriche',
  1
),
(
  'N020',
  'Quanti gatti hai in casa?',
  'Quanti orologi possiedi?',
  'numeriche',
  1
),
(
  'N021',
  'Quanti zaini hai in casa?',
  'Quanti film guardi in un mese?',
  'numeriche',
  1
),
(
  'N022',
  'Da 1 a 10, quanto valuti la tua intelligenza?',
  'Da 1 a 10, quanto ti valuteresti esteticamente?',
  'numeriche',
  1
),
(
  'N023',
  'Quanto daresti di paghetta mensile a tuo figlio?',
  'Quanto valgono le scarpe più costose che possiedi?',
  'numeriche',
  1
),
(
  'N024',
  'Se vincessi alla lotteria, quale percentuale daresti ai tuoi genitori?',
  'In percentuale, quanto credi nel karma?',
  'numeriche',
  1
),
(
  'N025',
  'Quanto si dovrebbe spendere al massimo per un primo appuntamento?',
  'Oltre quale cifra diventa troppo costoso mangiare al ristorante?',
  'numeriche',
  1
),
(
  'X001',
  'Quale paese ti piacerebbe visitare?',
  'Da quale paese provengono le ragazze più fighe?',
  'extra',
  1
),
(
  'X002',
  'Quanti minuti stai sul cesso?',
  'Quanti minuti impieghi ad addormentarti?',
  'extra',
  1
),
(
  'X003',
  'Quante volte ti sei cagato nei pantaloni?',
  'Quante volte al giorno pensi al cibo?',
  'extra',
  1
),
(
  'X004',
  'Quante volte scoreggi mediamente al giorno?',
  'Che età vorresti avere per sempre?',
  'extra',
  1
),
(
  'X005',
  'È un dieci, ma è stata con uno di voi: che voto diventa?',
  'È un dieci, ma è tua cugina: che voto diventa?',
  'extra',
  1
),
(
  'X006',
  'Quale genere musicale metteresti per scopare?',
  'Quale genere musicale ritieni sottovalutato?',
  'extra',
  1
),
(
  'X007',
  'Che cosa faresti se, per una sera, fossi immortale?',
  'Quale azione porterebbe alla morte peggiore?',
  'extra',
  1
);
