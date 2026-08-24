#!/usr/bin/env node
/**
 * Traduce e inserta el contenido real del blog (categorías, tags y posts)
 * en inglés (en), francés (fr), alemán (de) y ruso (ru).
 *
 * Asume que el esquema ya tiene soporte multi-idioma (columna `locale` y
 * UNIQUE(slug, locale) en categories/tags/posts) — migración a cargo de
 * ensureSchema() en ../lib/db.js. Este script NO crea esas columnas, solo
 * comprueba que existen antes de insertar (ver preflight()).
 *
 * Uso:
 *   node scripts/seed-i18n.js
 *
 * Es idempotente: si se ejecuta más de una vez, no duplica filas (comprueba
 * por slug + locale antes de cada INSERT).
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@libsql/client";
import { ensureSchema } from "../lib/db.js";

function loadDotenv() {
  const path = ".env";
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, "");
    if (k && !(k in process.env)) process.env[k] = v;
  }
}

loadDotenv();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) { console.error("Falta TURSO_DATABASE_URL"); process.exit(1); }
if (!authToken) { console.error("Falta TURSO_AUTH_TOKEN"); process.exit(1); }

const db = createClient({ url, authToken });

function id() {
  return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const LOCALES = ["en", "fr", "de", "ru"];

// ---------------------------------------------------------------------------
// Categorías: slug + sort_order originales (locale 'es'), con traducciones.
// ---------------------------------------------------------------------------
const CATEGORIES = [
  {
    slug: "clima-costa-blanca",
    sortOrder: 1,
    i18n: {
      en: { name: "The Costa Blanca Climate", description: "Saharan dust, sea salt, wind, and everything the Mediterranean throws at your windows." },
      fr: { name: "Le climat de la Costa Blanca", description: "Calima, embruns salins, vent : tout ce que la Méditerranée fait subir à vos vitres." },
      de: { name: "Das Klima der Costa Blanca", description: "Calima-Staub, Salzluft, Wind – alles, was das Mittelmeer Ihren Fenstern antut." },
      ru: { name: "Климат Коста-Бланки", description: "Калима, морская соль, ветер — всё, что Средиземное море делает с вашими окнами." },
    },
  },
  {
    slug: "negocios-hoteles",
    sortOrder: 2,
    i18n: {
      en: { name: "Guide for Businesses and Hotels", description: "Strategies and maintenance for shop windows, facades, and professional glasswork." },
      fr: { name: "Guide pour les entreprises et les hôtels", description: "Stratégies et entretien pour vitrines, façades et vitrerie professionnelle." },
      de: { name: "Leitfaden für Unternehmen und Hotels", description: "Strategien und Pflege für Schaufenster, Fassaden und professionelle Glasreinigung." },
      ru: { name: "Гид для бизнеса и отелей", description: "Стратегии и уход за витринами, фасадами и профессиональным остеклением." },
    },
  },
  {
    slug: "soluciones-hogar",
    sortOrder: 3,
    i18n: {
      en: { name: "Home Solutions", description: "Practical guides to keep your home's windows looking like new." },
      fr: { name: "Solutions pour la maison", description: "Guides pratiques pour garder les vitres de votre maison comme au premier jour." },
      de: { name: "Lösungen fürs Zuhause", description: "Praktische Anleitungen, damit die Fenster Ihres Zuhauses wie neu bleiben." },
      ru: { name: "Решения для дома", description: "Практические советы, как сохранить окна в доме как новые." },
    },
  },
  {
    slug: "seguridad-tecnica",
    sortOrder: 4,
    i18n: {
      en: { name: "Safety and Technique", description: "How we work: techniques, materials, and safety at height." },
      fr: { name: "Sécurité et technique", description: "Notre méthode de travail : techniques, matériel et sécurité en hauteur." },
      de: { name: "Sicherheit und Technik", description: "Wie wir arbeiten: Techniken, Materialien und Sicherheit in der Höhe." },
      ru: { name: "Безопасность и техника", description: "Как мы работаем: техники, материалы и безопасность на высоте." },
    },
  },
];

// ---------------------------------------------------------------------------
// Tags: slug se mantiene igual en todos los idiomas, solo se traduce `name`.
// ---------------------------------------------------------------------------
const TAGS = [
  { slug: "agua-osmotizada", i18n: { en: "Reverse-Osmosis Water", fr: "Eau osmosée", de: "Umkehrosmosewasser", ru: "Осмотическая вода" } },
  { slug: "calima", i18n: { en: "Saharan Dust", fr: "Brume de sable", de: "Saharastaub", ru: "Калима" } },
  { slug: "clima", i18n: { en: "Climate", fr: "Climat", de: "Klima", ru: "Климат" } },
  { slug: "costa-blanca", i18n: { en: "Costa Blanca", fr: "Costa Blanca", de: "Costa Blanca", ru: "Коста-Бланка" } },
  { slug: "altura", i18n: { en: "Windows at Height", fr: "Vitres en hauteur", de: "Fenster in der Höhe", ru: "Окна на высоте" } },
  { slug: "cristales-en-altura", i18n: { en: "Windows at Height", fr: "Vitres en hauteur", de: "Fenster in der Höhe", ru: "Окна на высоте" } },
  { slug: "escaparate", i18n: { en: "Shop Window", fr: "Vitrine", de: "Schaufenster", ru: "Витрина" } },
  { slug: "espejos", i18n: { en: "Mirrors", fr: "Miroirs", de: "Spiegel", ru: "Зеркала" } },
  { slug: "hogar", i18n: { en: "Home", fr: "Maison", de: "Zuhause", ru: "Дом" } },
  { slug: "mantenimiento", i18n: { en: "Maintenance", fr: "Entretien", de: "Wartung", ru: "Обслуживание" } },
  { slug: "negocios", i18n: { en: "Business", fr: "Entreprises", de: "Unternehmen", ru: "Бизнес" } },
  { slug: "productos", i18n: { en: "Products", fr: "Produits", de: "Produkte", ru: "Продукты" } },
  { slug: "rappel", i18n: { en: "Rope Access", fr: "Rappel", de: "Abseiltechnik", ru: "Верёвочный доступ" } },
  { slug: "salitre", i18n: { en: "Sea Salt", fr: "Embruns salins", de: "Salzablagerung", ru: "Соляной налёт" } },
  { slug: "seguridad", i18n: { en: "Safety", fr: "Sécurité", de: "Sicherheit", ru: "Безопасность" } },
  { slug: "temporada", i18n: { en: "Season", fr: "Saison", de: "Saison", ru: "Сезон" } },
  { slug: "vidrio", i18n: { en: "Glass", fr: "Verre", de: "Glas", ru: "Стекло" } },
];

// ---------------------------------------------------------------------------
// Posts: metadatos originales (slug, published, categorySlug, tags) tal cual
// están en la BD en español, más las traducciones de title/excerpt/body/dateLabel.
// El body conserva la estructura markdown (##, ###, -, **negrita**).
// ---------------------------------------------------------------------------
const POSTS = [
  {
    slug: "calima-costa-blanca",
    published: 1,
    categorySlug: "clima-costa-blanca",
    tags: ["clima", "calima", "costa-blanca", "agua-osmotizada"],
    i18n: {
      en: {
        title: "Calima Survival Guide: How to Clean Saharan Dust Without Scratching the Glass",
        excerpt: "Calima leaves an abrasive mineral layer that, if cleaned the wrong way, turns your glass into a permanent scratch-fest. Here's the professional 3-step method.",
        dateLabel: "March 5, 2026",
        body: `## Why does calima make windows "impossible" to clean?

What arrives from the Sahara isn't ordinary dust. It's a mix of clay, quartz and calcium carbonate with a particle size that's perfect for acting like sandpaper. If you rub it dry, what looks like cleaning is actually scratching the glass irreversibly.

### Average particle size: 2 to 10 microns

A grain of beach sand is around 100 microns. Calima particles are 10 to 50 times finer: they work their way into the pores of the glass and into any joint. That's why a cloth, however clean, isn't enough on its own.

## Professional 3-step method

- **Generous soaking.** Spray reverse-osmosis water or, failing that, tap water with a splash of vinegar (1 part per 10). Cover the whole surface and let it sit for 2 minutes so the dust hydrates.
- **One single squeegee pass.** Use a brand-new rubber squeegee, top to bottom, without going over it again. Every dry re-pass is a chance to scratch.
- **Final rinse with reverse-osmosis water.** Removes the last mineral traces and lets the glass air-dry. If you use tap water, the typical white marks will appear as it evaporates.

## What you should never do

- Use dry newspaper: the ink and fibres scratch the glass.
- Rub with a dirty microfibre cloth: it will trap the grains and turn them into abrasive paste.
- Apply ammonia directly onto hot glass: it evaporates before it can work and leaves residue.
- Clean in direct sunlight: the heat dries the product too fast and leaves halos.

## How often should you clean during a calima episode?

- **Outdoor windows:** every 24-48 hours for as long as it lasts.
- **Frames and joints:** once a day, before the mix hardens.
- **Shutters and grilles:** at the end of the episode, with a low-pressure pressure washer.

## What if it already has scratches?

Fine calima scratches can be polished out with cerium oxide applied by a professional. If the glass is already old and had micro-scratches before, calima just makes them visible. In that case it's worth considering technical polishing or replacing the glass before the next spring.`,
      },
      fr: {
        title: "Guide de survie à la calima : comment nettoyer la poussière du Sahara sans rayer le verre",
        excerpt: "La calima laisse une couche minérale abrasive qui, mal nettoyée, transforme le verre en surface rayée de façon permanente. Voici la méthode professionnelle en 3 étapes.",
        dateLabel: "5 mars 2026",
        body: `## Pourquoi la calima rend les vitres "impossibles" à nettoyer ?

Ce qui arrive du Sahara n'est pas de la poussière ordinaire. C'est un mélange d'argile, de quartz et de carbonate de calcium dont la taille de particule est idéale pour agir comme du papier de verre. Si vous frottez à sec, ce qui ressemble à un nettoyage raye en réalité le verre de façon irréversible.

### Taille moyenne des particules : entre 2 et 10 microns

Un grain de sable de plage fait environ 100 microns. La calima est 10 à 50 fois plus fine : elle s'infiltre dans les pores du verre et dans le moindre joint. C'est pourquoi un chiffon, aussi propre soit-il, ne suffit pas.

## Méthode professionnelle en 3 étapes

- **Trempage généreux.** Vaporisez de l'eau osmosée ou, à défaut, de l'eau du robinet avec un peu de vinaigre (1 dose pour 10). Couvrez toute la surface et laissez agir 2 minutes pour que la boue s'hydrate.
- **Un seul passage de raclette.** Utilisez une raclette en caoutchouc neuve, de haut en bas, sans repasser. Chaque repassage à sec est une occasion de rayer.
- **Rinçage final à l'eau osmosée.** Élimine les derniers résidus minéraux et laisse sécher à l'air. Avec de l'eau du robinet, les fameuses traces blanches apparaîtront en séchant.

## Ce qu'il ne faut jamais faire

- Utiliser du papier journal sec : l'encre et les fibres rayent.
- Frotter avec une microfibre sale : elle piégera les grains et les transformera en pâte abrasive.
- Appliquer de l'ammoniaque directement sur du verre chaud : il s'évapore avant d'agir et laisse des résidus.
- Nettoyer en plein soleil : la chaleur sèche le produit trop vite et laisse des auréoles.

## À quelle fréquence nettoyer pendant un épisode de calima ?

- **Vitres extérieures :** toutes les 24 à 48 heures tant que dure l'épisode.
- **Cadres et joints :** une fois par jour, avant que le mélange ne durcisse.
- **Volets et grilles :** à la fin de l'épisode, au nettoyeur haute pression basse intensité.

## Et si le verre est déjà rayé ?

Les fines rayures de calima peuvent être polies à l'oxyde de cérium par un professionnel. Si le verre a déjà des années et portait de micro-rayures antérieures, la calima les rend simplement visibles. Dans ce cas, mieux vaut envisager un polissage technique ou le remplacement du verre avant le printemps prochain.`,
      },
      de: {
        title: "Calima-Überlebensguide: Wie Sie Saharastaub entfernen, ohne das Glas zu verkratzen",
        excerpt: "Calima hinterlässt eine abrasive Mineralschicht, die bei falscher Reinigung das Glas dauerhaft verkratzt. Wir zeigen die professionelle 3-Schritte-Methode.",
        dateLabel: "5. März 2026",
        body: `## Warum macht Calima Fenster "unmöglich" sauber zu bekommen?

Was aus der Sahara kommt, ist kein gewöhnlicher Staub. Es ist eine Mischung aus Ton, Quarz und Kalziumkarbonat mit einer Partikelgröße, die ideal wirkt wie Schleifpapier. Wenn man trocken darüberreibt, wirkt es wie Reinigung, verkratzt das Glas dabei aber unwiderruflich.

### Durchschnittliche Partikelgröße: 2 bis 10 Mikrometer

Ein Sandkorn vom Strand misst rund 100 Mikrometer. Calima-Partikel sind 10 bis 50 Mal feiner: Sie setzen sich in den Poren des Glases und in jeder Fuge fest. Deshalb reicht ein noch so sauberes Tuch allein nicht aus.

## Professionelle 3-Schritte-Methode

- **Großzügig einweichen.** Osmosewasser aufsprühen oder, falls nicht vorhanden, Leitungswasser mit einem Schuss Essig (1 Teil auf 10). Die gesamte Fläche bedecken und 2 Minuten einwirken lassen, damit sich der Staub löst.
- **Ein einziger Abzieherzug.** Einen neuen Gummiabzieher von oben nach unten führen, ohne nachzuziehen. Jeder trockene Nachzug ist eine Gelegenheit zum Verkratzen.
- **Abschließendes Nachspülen mit Osmosewasser.** Entfernt die letzten Mineralreste und lässt das Glas an der Luft trocknen. Bei Leitungswasser entstehen beim Verdunsten die typischen weißen Flecken.

## Was Sie niemals tun sollten

- Trockenes Zeitungspapier verwenden: Tinte und Fasern verkratzen.
- Mit schmutzigem Mikrofasertuch reiben: Es fängt die Körner ein und macht daraus eine Schleifpaste.
- Ammoniak direkt auf heißes Glas auftragen: Es verdunstet, bevor es wirkt, und hinterlässt Rückstände.
- Bei praller Sonne reinigen: Die Hitze trocknet das Mittel zu schnell und hinterlässt Schlieren.

## Wie oft während einer Calima-Episode reinigen?

- **Außenfenster:** alle 24-48 Stunden, solange die Episode andauert.
- **Rahmen und Fugen:** einmal täglich, bevor die Mischung aushärtet.
- **Rollläden und Gitter:** am Ende der Episode, mit einem Niederdruckreiniger.

## Und wenn schon Kratzer da sind?

Feine Calima-Kratzer lassen sich von einem Fachbetrieb mit Zeriumoxid polieren. Ist das Glas bereits älter und hatte vorher schon Mikrokratzer, macht Calima diese lediglich sichtbar. In dem Fall lohnt es sich, ein technisches Polieren oder den Austausch des Glases vor dem nächsten Frühjahr zu prüfen.`,
      },
      ru: {
        title: "Гид по выживанию во время калимы: как очистить сахарскую пыль, не поцарапав стекло",
        excerpt: "Калима оставляет абразивный минеральный слой, который при неправильной очистке навсегда царапает стекло. Рассказываем о профессиональном методе в 3 шага.",
        dateLabel: "5 марта 2026 г.",
        body: `## Почему калима делает окна «невозможными» для мытья?

То, что прилетает из Сахары, — не обычная пыль. Это смесь глины, кварца и карбоната кальция с размером частиц, идеальным для работы наждачной бумагой. Если тереть насухо, вместо чистки вы необратимо царапаете стекло.

### Средний размер частиц: от 2 до 10 микрон

Песчинка с пляжа — около 100 микрон. Частицы калимы в 10-50 раз мельче: они забиваются в поры стекла и в любые щели. Поэтому обычная тряпка, даже самая чистая, недостаточна.

## Профессиональный метод в 3 шага

- **Обильное смачивание.** Разбрызгайте осмотическую воду или, за неимением её, водопроводную воду с добавлением уксуса (1 часть на 10). Покройте всю поверхность и оставьте на 2 минуты, чтобы грязь размокла.
- **Один проход стяжкой.** Используйте новую резиновую стяжку, сверху вниз, без повторных проходов. Каждый сухой повторный проход — это риск поцарапать стекло.
- **Финальное ополаскивание осмотической водой.** Удаляет последние минеральные остатки и позволяет стеклу высохнуть на воздухе. При использовании водопроводной воды при высыхании появятся типичные белые разводы.

## Чего никогда не следует делать

- Использовать сухую газету: чернила и волокна царапают стекло.
- Тереть грязной микрофиброй: она соберёт песчинки и превратит их в абразивную пасту.
- Наносить аммиак прямо на горячее стекло: он испаряется, не успев подействовать, и оставляет следы.
- Мыть под прямыми солнечными лучами: жара слишком быстро высушивает средство и оставляет разводы.

## Как часто мыть во время калимы?

- **Наружные стёкла:** каждые 24-48 часов, пока длится явление.
- **Рамы и стыки:** раз в день, пока смесь не затвердела.
- **Жалюзи и решётки:** в конце эпизода, мойкой низкого давления.

## А если уже есть царапины?

Мелкие царапины от калимы поддаются полировке оксидом церия, выполняемой профессионалом. Если стеклу уже много лет и на нём были микроцарапины и раньше, калима просто делает их заметными. В этом случае стоит рассмотреть техническую полировку или замену стекла до наступления следующей весны.`,
      },
    },
  },
  {
    slug: "salitre-cristales",
    published: 1,
    categorySlug: "clima-costa-blanca",
    tags: ["clima", "salitre", "costa-blanca", "mantenimiento"],
    i18n: {
      en: {
        title: "Sea Salt: The Invisible Enemy of Your Sea Views",
        excerpt: "Mediterranean sea salt crystallises in the pores of the glass and clouds it over time. Learn how to spot it and remove it for good.",
        dateLabel: "February 12, 2026",
        body: `## What is sea salt build-up?

Sea salt dissolved in the air settles on any exposed surface. When the water evaporates, sodium and magnesium chloride crystals stay anchored in the pores of the glass. Over time, that micro-layer thickens until the glass becomes a translucent wall.

### Costa Blanca: the perfect scenario

Within 200 metres of the coastline, airborne salt concentration exceeds 300 mg/m³ on days with an easterly wind. In Benidorm, Altea and La Nucía, east-facing windows are the first to show the problem.

## How to spot it (before it's too late)

- Run your finger over the clean glass — if it feels "rough, like fine sandpaper", it's sea salt.
- After cleaning, the glass is left with a **haze that won't go away even with regular glass cleaner**.
- Held up to the light, you'll see a uniform whitish film that isn't grease or dust.

## Professional treatment

- **Neutral wash.** Warm water + pH-neutral soap. Rinse thoroughly.
- **Specific descaler.** Apply citric acid or 10% cleaning vinegar to the affected area. Leave for 5 minutes.
- **Rinse with reverse-osmosis water.** Critical: rinsing with tap water will just reload the surface with new salts.
- **Anti-salt sealant.** A water-repellent product that closes the pores of the glass for 6 to 12 months.

## Preventive maintenance

### Recommended schedule for beachfront homes

- Light exterior cleaning: every 15 days.
- Deep cleaning + joint inspection: every 3 months.
- Anti-salt sealant application: every 6 months (before summer).

### A trick that never fails

After every cleaning, run a microfibre cloth lightly dampened with reverse-osmosis water over the glass. If the cloth comes away clean, you're done. If it comes away with white marks, rinse again.

## Common mistake: cleaning with ammonia

Ammonia dissolves grease but not salts. After an ammonia treatment, the sea salt is still there, and the next rinse just redistributes it, making the haze worse.`,
      },
      fr: {
        title: "Embruns salins : l'ennemi invisible de vos vues sur mer",
        excerpt: "Le sel de la Méditerranée cristallise dans les pores du verre et l'opacifie avec le temps. Apprenez à le repérer et à l'éliminer définitivement.",
        dateLabel: "12 février 2026",
        body: `## Qu'est-ce que le salitre (dépôt de sel marin) ?

Le sel marin dissous dans l'air se dépose sur toute surface exposée. Quand l'eau s'évapore, les cristaux de chlorure de sodium et de magnésium restent ancrés dans les pores du verre. Avec le temps, cette micro-couche s'épaissit jusqu'à transformer la vitre en mur translucide.

### La Costa Blanca : le terrain parfait

À 200 mètres du littoral, la concentration de sel dans l'air dépasse 300 mg/m³ les jours de vent de levant. À Benidorm, Altea et La Nucía, les vitres orientées à l'est sont les premières à montrer le problème.

## Comment le repérer (avant qu'il ne soit trop tard)

- Passez le doigt sur la vitre propre : si elle est "rugueuse comme du papier de verre fin", c'est du salitre.
- Après le nettoyage, la vitre garde une **brume qui ne part pas, même avec un nettoyant vitres classique**.
- À contre-jour, vous verrez une couche blanchâtre uniforme qui n'est ni de la graisse ni de la poussière.

## Traitement professionnel

- **Lavage neutre.** Eau tiède + savon au pH neutre. Rincer abondamment.
- **Désincrustant spécifique.** Appliquer de l'acide citrique ou du vinaigre de nettoyage à 10 % sur la zone touchée. Laisser agir 5 minutes.
- **Rinçage à l'eau osmosée.** Essentiel : tout rinçage à l'eau du robinet redéposera de nouveaux sels sur la surface.
- **Scellant anti-sel.** Produit hydrofuge qui referme les pores du verre pendant 6 à 12 mois.

## Entretien préventif

### Calendrier recommandé pour les logements en bord de mer

- Nettoyage extérieur léger : tous les 15 jours.
- Nettoyage en profondeur + contrôle des joints : tous les 3 mois.
- Application du scellant anti-sel : tous les 6 mois (avant l'été).

### L'astuce infaillible

Après chaque nettoyage, passez un chiffon microfibre légèrement humidifié à l'eau osmosée. S'il ressort propre, c'est terminé. S'il ressort avec des traces blanches, recommencez le rinçage.

## Erreur fréquente : nettoyer à l'ammoniaque

L'ammoniaque dissout la graisse mais pas les sels. Après un traitement à l'ammoniaque, le salitre est toujours là, et le rinçage suivant le redistribue, aggravant l'opacité.`,
      },
      de: {
        title: "Salzablagerung: Der unsichtbare Feind Ihres Meerblicks",
        excerpt: "Das Mittelmeersalz kristallisiert in den Poren des Glases und trübt es mit der Zeit ein. Lernen Sie, es zu erkennen und dauerhaft zu entfernen.",
        dateLabel: "12. Februar 2026",
        body: `## Was ist Salzablagerung (Salitre)?

In der Luft gelöstes Meersalz setzt sich auf jeder exponierten Oberfläche ab. Verdunstet das Wasser, bleiben Natrium- und Magnesiumchlorid-Kristalle in den Poren des Glases zurück. Mit der Zeit wird diese Mikroschicht dicker, bis das Glas zu einer trüben Wand wird.

### Costa Blanca: das perfekte Szenario

Innerhalb von 200 Metern zur Küste übersteigt die Salzkonzentration in der Luft an Tagen mit Ostwind 300 mg/m³. In Benidorm, Altea und La Nucía zeigen ostseitige Fenster das Problem zuerst.

## Wie man es erkennt (bevor es zu spät ist)

- Fahren Sie mit dem Finger über das saubere Glas – fühlt es sich "rau wie feines Schleifpapier" an, ist es Salzablagerung.
- Nach dem Putzen bleibt ein **Schleier, der auch mit normalem Glasreiniger nicht verschwindet**.
- Gegen das Licht gehalten sehen Sie eine gleichmäßige weißliche Schicht, die weder Fett noch Staub ist.

## Professionelle Behandlung

- **Neutrale Wäsche.** Lauwarmes Wasser + pH-neutrale Seife. Gründlich nachspülen.
- **Spezielles Entkalkungsmittel.** Zitronensäure oder 10%igen Reinigungsessig auf die betroffene Stelle auftragen. 5 Minuten einwirken lassen.
- **Nachspülen mit Osmosewasser.** Entscheidend: Jedes Nachspülen mit Leitungswasser lagert neue Salze auf der Oberfläche ab.
- **Anti-Salz-Versiegelung.** Ein wasserabweisendes Produkt, das die Poren des Glases für 6 bis 12 Monate verschließt.

## Vorbeugende Pflege

### Empfohlener Kalender für Wohnungen direkt am Meer

- Leichte Außenreinigung: alle 15 Tage.
- Tiefenreinigung + Fugenkontrolle: alle 3 Monate.
- Anti-Salz-Versiegelung: alle 6 Monate (vor dem Sommer).

### Ein Trick, der nie versagt

Nach jeder Reinigung ein leicht mit Osmosewasser angefeuchtetes Mikrofasertuch über das Glas ziehen. Kommt das Tuch sauber heraus, sind Sie fertig. Zeigt es weiße Flecken, nochmals nachspülen.

## Häufiger Fehler: mit Ammoniak reinigen

Ammoniak löst Fett, aber keine Salze. Nach einer Ammoniak-Behandlung ist die Salzablagerung immer noch da, und die nächste Spülung verteilt sie nur neu und verschlimmert die Trübung.`,
      },
      ru: {
        title: "Соляной налёт: невидимый враг вашего вида на море",
        excerpt: "Соль Средиземного моря кристаллизуется в порах стекла и со временем делает его мутным. Узнайте, как распознать и окончательно устранить налёт.",
        dateLabel: "12 февраля 2026 г.",
        body: `## Что такое солевой налёт (салитре)?

Морская соль, растворённая в воздухе, оседает на любой открытой поверхности. Когда вода испаряется, кристаллы хлорида натрия и магния остаются в порах стекла. Со временем этот микрослой утолщается, превращая стекло в полупрозрачную стену.

### Коста-Бланка: идеальные условия

В 200 метрах от береговой линии концентрация соли в воздухе в дни восточного ветра превышает 300 мг/м³. В Бенидорме, Альтеа и Ла-Нусии окна, выходящие на восток, первыми показывают проблему.

## Как распознать (пока не поздно)

- Проведите пальцем по чистому стеклу — если оно «шероховатое, как мелкая наждачная бумага», это солевой налёт.
- После мытья на стекле остаётся **дымка, которая не исчезает даже с обычным средством для стёкол**.
- На просвет вы увидите равномерную беловатую плёнку, которая не является ни жиром, ни пылью.

## Профессиональная обработка

- **Нейтральное мытьё.** Тёплая вода + мыло с нейтральным pH. Тщательное ополаскивание.
- **Специальный удалитель накипи.** Нанести лимонную кислоту или 10%-й уксус для чистки на поражённый участок. Оставить на 5 минут.
- **Ополаскивание осмотической водой.** Критично: ополаскивание водопроводной водой снова покроет поверхность новыми солями.
- **Защита от соли.** Водоотталкивающее средство, закрывающее поры стекла на 6-12 месяцев.

## Профилактическое обслуживание

### Рекомендуемый график для жилья на первой линии

- Лёгкая наружная чистка: каждые 15 дней.
- Глубокая чистка + осмотр стыков: каждые 3 месяца.
- Нанесение защиты от соли: каждые 6 месяцев (перед летом).

### Безотказный приём

После каждой чистки проведите по стеклу микрофиброй, слегка смоченной осмотической водой. Если ткань осталась чистой — вы закончили. Если на ней белые следы — повторите ополаскивание.

## Частая ошибка: чистка аммиаком

Аммиак растворяет жир, но не соли. После обработки аммиаком солевой налёт никуда не девается, а следующее ополаскивание лишь перераспределяет его, усиливая помутнение.`,
      },
    },
  },
  {
    slug: "psicologia-escaparate",
    published: 1,
    categorySlug: "negocios-hoteles",
    tags: ["negocios", "escaparate", "mantenimiento"],
    i18n: {
      en: {
        title: "Shop Window Psychology: How a Dirty Window Loses You Sales",
        excerpt: "The brain decides in 3 seconds whether to walk into your shop. A cloudy window can cost you up to 20% of your footfall, according to recent neuromarketing studies.",
        dateLabel: "January 20, 2026",
        body: `## The 3 seconds worth 20% of your revenue

A study by Maastricht University (2019) used eye-tracking to measure what passers-by look at when walking past a shop window. The conclusion is stark: the brain decides in 3 seconds whether to go in or keep walking. And the first thing it evaluates isn't the product, the sign, or the price: it's **the state of the glass**.

### The "dirty glass effect"

Neuroscientists call it the *abandonment heuristic*: if the upkeep of the entrance is visibly poor, the customer assumes the inside is neglected too. It's an unconscious but powerful mental shortcut. A window with fingerprints, dust on the frame, or rain streaks sends three messages at once:

- "This business doesn't care about details."
- "If the window looks like this, imagine the product."
- "There's probably no one left in the back room."

## The rule of 3 layers

When a shop window accumulates grime, it does so in three layers that the human eye picks up on, even without being able to name them:

### Layer 1 · What you see

Fresh dust, fingerprints, raindrops. Quick clean with water and microfibre.

### Layer 2 · What your regulars see

Limescale halos, marks from old posters, dust on the frame. Fortnightly cleaning with a specific product.

### Layer 3 · What only new customers see

Scratches, haziness, grime stuck to the bottom of the frame. Needs professional cleaning every 30-45 days.

## Recommended frequency by business type

- **Waterfront hospitality:** exterior daily, interior every 3 days.
- **High-street shops in central Benidorm:** exterior every 2 days, interior every 7 days.
- **Offices and professional practices:** exterior every 7 days, interior every 14 days.
- **Full window display with rotating exhibits:** full clean every 15 days.

## The ROI of a clean shop window

We compared data from 14 businesses across the Marina Baixa between 2023 and 2025:

- Businesses with a spotless window: 22% more convertible foot traffic.
- Businesses cleaning every 2-3 days: 8% higher average ticket.
- Businesses cleaning monthly or less: 40% lower window-display turnover (owners stop investing once they see no return).

The key figure: a professional shop-window clean costs between €5 and €12 per visit. Winning back one new customer a day pays for the investment within the first week.

## How to maintain it between professional cleans

- Run a dry microfibre cloth over the inside every morning.
- Take down old posters and vinyls as soon as they expire.
- Keep a basic kit (squeegee, microfibre, reverse-osmosis water) by the counter.
- Schedule the professional clean on the same day every month: consistency is what keeps the brand perception intact.`,
      },
      fr: {
        title: "Psychologie de la vitrine : comment une vitre sale vous fait perdre des ventes",
        excerpt: "Le cerveau décide en 3 secondes s'il entre dans votre magasin. Une vitrine opaque vous fait perdre jusqu'à 20 % de clientèle, selon de récentes études de neuromarketing.",
        dateLabel: "20 janvier 2026",
        body: `## Les 3 secondes qui valent 20 % de votre chiffre d'affaires

Une étude de l'université de Maastricht (2019) a mesuré par eye-tracking ce que regardent les passants devant une vitrine. La conclusion est sans appel : le cerveau décide en 3 secondes s'il entre ou continue son chemin. Et le premier élément évalué n'est ni le produit, ni l'affiche, ni le prix : c'est **l'état de la vitre**.

### L'"effet vitre sale"

Les neuroscientifiques appellent cela l'*heuristique d'abandon* : si l'entretien de l'accès est visiblement négligé, le client suppose que l'intérieur l'est aussi. C'est un raccourci mental inconscient mais puissant. Une vitre avec des traces de doigts, de la poussière sur le cadre ou des traces de pluie envoie trois messages simultanés :

- "Ce commerce ne soigne pas les détails."
- "Si la vitrine est comme ça, imaginez le produit."
- "Il n'y a probablement plus personne à l'arrière-boutique."

## La règle des 3 couches

Quand une vitrine accumule la saleté, elle le fait en trois couches que l'œil humain détecte même sans savoir les nommer :

### Couche 1 · Ce que vous voyez

Poussière récente, traces de doigts, gouttes de pluie. Nettoyage rapide à l'eau et à la microfibre.

### Couche 2 · Ce que voient vos clients habituels

Auréoles de calcaire, traces d'anciennes affiches, poussière sur le cadre. Nettoyage bimensuel avec un produit spécifique.

### Couche 3 · Ce que seuls les nouveaux clients voient

Rayures, opacité, saleté incrustée en bas du cadre. Nécessite un nettoyage professionnel tous les 30 à 45 jours.

## Fréquence recommandée par type de commerce

- **Hôtellerie en front de mer :** extérieur quotidien, intérieur tous les 3 jours.
- **Commerce de rue au centre de Benidorm :** extérieur tous les 2 jours, intérieur tous les 7 jours.
- **Bureaux et cabinets professionnels :** extérieur tous les 7 jours, intérieur tous les 14 jours.
- **Vitrine complète avec exposition changeante :** nettoyage complet tous les 15 jours.

## Le ROI d'une vitrine propre

Nous avons croisé les données de 14 commerces de la Marina Baixa entre 2023 et 2025 :

- Commerces à la vitrine impeccable : 22 % de trafic piéton convertible en plus.
- Commerces nettoyés tous les 2-3 jours : ticket moyen 8 % supérieur.
- Commerces nettoyés une fois par mois ou moins : rotation de la vitrine 40 % plus faible (les propriétaires cessent d'investir faute de retour visible).

La donnée clé : un nettoyage professionnel de vitrine coûte entre 5 et 12 euros par intervention. Récupérer un nouveau client par jour amortit l'investissement dès la première semaine.

## Comment l'entretenir entre deux nettoyages professionnels

- Passez un chiffon microfibre sec sur l'intérieur chaque matin.
- Retirez affiches et vinyles périmés dès qu'ils expirent.
- Gardez un kit de base (raclette, microfibre, eau osmosée) près du comptoir.
- Programmez le nettoyage professionnel le même jour chaque mois : la régularité est ce qui préserve la perception de la marque.`,
      },
      de: {
        title: "Schaufenster-Psychologie: Wie ein schmutziges Fenster Ihnen Umsatz kostet",
        excerpt: "Das Gehirn entscheidet in 3 Sekunden, ob es Ihr Geschäft betritt. Ein trübes Schaufenster kostet Sie laut aktuellen Neuromarketing-Studien bis zu 20 % der Kundschaft.",
        dateLabel: "20. Januar 2026",
        body: `## Die 3 Sekunden, die 20 % Ihres Umsatzes wert sind

Eine Studie der Universität Maastricht (2019) hat per Eye-Tracking gemessen, worauf Passanten vor einem Schaufenster achten. Das Ergebnis ist eindeutig: Das Gehirn entscheidet in 3 Sekunden, ob es hineingeht oder weitergeht. Und das Erste, was bewertet wird, ist weder das Produkt noch das Schild noch der Preis: es ist **der Zustand des Glases**.

### Der "Schmutziges-Glas-Effekt"

Neurowissenschaftler nennen es die *Abandonment Heuristic*: Ist die Pflege des Eingangs sichtbar vernachlässigt, geht der Kunde davon aus, dass auch das Innere vernachlässigt ist. Es ist eine unbewusste, aber wirkungsvolle mentale Abkürzung. Ein Fenster mit Fingerabdrücken, Staub am Rahmen oder Regenspuren sendet drei Botschaften gleichzeitig:

- "Dieses Geschäft kümmert sich nicht um Details."
- "Wenn das Schaufenster so aussieht, stellen Sie sich das Produkt vor."
- "Im Hinterzimmer ist wahrscheinlich niemand mehr."

## Die Regel der 3 Schichten

Wenn sich Schmutz an einem Schaufenster ansammelt, geschieht das in drei Schichten, die das menschliche Auge erkennt, auch ohne sie benennen zu können:

### Schicht 1 · Was Sie sehen

Frischer Staub, Fingerabdrücke, Regentropfen. Schnelle Reinigung mit Wasser und Mikrofaser.

### Schicht 2 · Was Ihre Stammkunden sehen

Kalkränder, Spuren alter Plakate, Staub am Rahmen. Zweiwöchentliche Reinigung mit speziellem Produkt.

### Schicht 3 · Was nur neue Kunden sehen

Kratzer, Trübung, Schmutz am unteren Rahmenrand. Erfordert professionelle Reinigung alle 30-45 Tage.

## Empfohlene Häufigkeit nach Geschäftsart

- **Gastronomie direkt am Meer:** außen täglich, innen alle 3 Tage.
- **Ladengeschäft im Zentrum von Benidorm:** außen alle 2 Tage, innen alle 7 Tage.
- **Büros und Praxen:** außen alle 7 Tage, innen alle 14 Tage.
- **Komplettes Schaufenster mit wechselnder Auslage:** komplette Reinigung alle 15 Tage.

## Der ROI eines sauberen Schaufensters

Wir haben Daten von 14 Geschäften aus der Marina Baixa zwischen 2023 und 2025 verglichen:

- Geschäfte mit makellosem Schaufenster: 22 % mehr konvertierbarer Fußgängerverkehr.
- Geschäfte mit Reinigung alle 2-3 Tage: 8 % höherer durchschnittlicher Bon.
- Geschäfte mit monatlicher oder selteneren Reinigung: 40 % geringere Wechselrate der Auslage (Inhaber investieren nicht mehr, wenn sie keinen Nutzen sehen).

Die entscheidende Zahl: Eine professionelle Schaufensterreinigung kostet zwischen 5 und 12 Euro pro Einsatz. Einen neuen Kunden pro Tag zu gewinnen, amortisiert die Investition bereits in der ersten Woche.

## So halten Sie es zwischen den professionellen Reinigungen sauber

- Wischen Sie jeden Morgen mit einem trockenen Mikrofasertuch die Innenseite ab.
- Entfernen Sie alte Plakate und Folien, sobald sie abgelaufen sind.
- Bewahren Sie ein Basis-Set (Abzieher, Mikrofaser, Osmosewasser) am Tresen auf.
- Planen Sie die professionelle Reinigung jeden Monat am selben Tag: Beständigkeit ist es, was die Markenwahrnehmung erhält.`,
      },
      ru: {
        title: "Психология витрины: как грязное стекло лишает вас продаж",
        excerpt: "Мозг за 3 секунды решает, зайти ли в ваш магазин. Мутная витрина может стоить вам до 20% посетителей, согласно последним исследованиям нейромаркетинга.",
        dateLabel: "20 января 2026 г.",
        body: `## 3 секунды, которые стоят 20% вашей выручки

Исследование Маастрихтского университета (2019) с помощью айтрекинга измерило, на что смотрят прохожие перед витриной. Вывод однозначен: мозг за 3 секунды решает, зайти или пройти мимо. И первое, что оценивается, — не товар, не вывеска и не цена, а **состояние стекла**.

### «Эффект грязного стекла»

Нейробиологи называют это *эвристикой заброшенности*: если уход за входом заметно запущен, клиент предполагает, что и внутри всё запущено. Это бессознательный, но мощный ментальный приём. Стекло с отпечатками пальцев, пылью на раме или следами дождя одновременно посылает три сообщения:

- «Этот бизнес не заботится о деталях».
- «Если витрина такая, представьте, каков товар».
- «В подсобке, вероятно, уже никого нет».

## Правило 3 слоёв

Когда витрина накапливает грязь, это происходит в три слоя, которые человеческий глаз замечает, даже не умея их назвать:

### Слой 1 · Что видите вы

Свежая пыль, отпечатки пальцев, капли дождя. Быстрая чистка водой и микрофиброй.

### Слой 2 · Что видят ваши постоянные клиенты

Известковые разводы, следы старых плакатов, пыль на раме. Чистка раз в две недели специальным средством.

### Слой 3 · Что видят только новые клиенты

Царапины, помутнение, грязь, прилипшая к нижней части рамы. Требует профессиональной чистки каждые 30-45 дней.

## Рекомендуемая частота по типу бизнеса

- **Заведения на первой линии моря:** снаружи ежедневно, изнутри каждые 3 дня.
- **Магазины в центре Бенидорма:** снаружи каждые 2 дня, изнутри каждые 7 дней.
- **Офисы и приёмные:** снаружи каждые 7 дней, изнутри каждые 14 дней.
- **Полная витрина со сменной экспозицией:** полная чистка каждые 15 дней.

## Окупаемость чистой витрины

Мы сопоставили данные 14 предприятий Марина-Байша за 2023-2025 годы:

- Предприятия с безупречной витриной: на 22% больше конвертируемого пешеходного трафика.
- Предприятия с чисткой каждые 2-3 дня: средний чек на 8% выше.
- Предприятия с чисткой раз в месяц или реже: оборот витрины на 40% ниже (владельцы перестают вкладываться, не видя отдачи).

Ключевая цифра: профессиональная чистка витрины стоит от 5 до 12 евро за визит. Возврат одного нового клиента в день окупает вложение уже за первую неделю.

## Как поддерживать её между профессиональными чистками

- Каждое утро протирайте изнутри сухой микрофиброй.
- Убирайте старые плакаты и наклейки сразу после истечения срока.
- Держите базовый набор (стяжка, микрофибра, осмотическая вода) у прилавка.
- Планируйте профессиональную чистку в один и тот же день каждый месяц: именно постоянство поддерживает восприятие бренда.`,
      },
    },
  },
  {
    slug: "agua-pura-osmotizada",
    published: 1,
    categorySlug: "seguridad-tecnica",
    tags: ["agua-osmotizada", "altura", "mantenimiento"],
    i18n: {
      en: {
        title: "What Is Pure Reverse-Osmosis Water? The Science Behind Our Cleaning",
        excerpt: "Zero marks, zero residue, no chemicals. Here's why professionals worldwide use reverse-osmosis water to clean windows at height.",
        dateLabel: "January 10, 2026",
        body: `## The problem with tap water

The water from your tap contains between 200 and 600 mg/l of mineral salts (calcium, magnesium, sodium, potassium). As it evaporates on the glass, those salts form a whitish micro-layer. Those are the "marks" you see even after a thorough clean.

### The transparency test

If you clean a window with tap water and hold it up to the light, you'll see halos. Do the same with reverse-osmosis water, and you'll see nothing at all. The difference isn't luck — it's physics.

## What makes it "pure"?

Reverse-osmosis water has gone through a 4- or 5-stage **reverse osmosis** system that removes between 95% and 99% of dissolved minerals and salts. What's left is, technically, near-pure H₂O, with a conductivity below 10 microsiemens/cm.

### The 4 stages of the system

- **Sediment filter.** Removes suspended particles (5 microns).
- **Activated carbon filter.** Removes chlorine and organic compounds.
- **Osmosis membrane.** The heart of the system. Water is forced through a semi-permeable membrane that only lets H₂O molecules through.
- **Polishing post-filter.** Gives the water's taste and purity a final polish.

## Practical benefits in professional cleaning

- **No residue when it dries.** As it evaporates, no minerals are left behind, so the glass is left perfect without having to go over it again.
- **Dissolves greasy dirt better.** Being "empty" water, it tends to balance itself out by absorbing whatever is around it, including grease and dust.
- **Lets you clean without chemicals.** For most glass, reverse-osmosis water and a good squeegee are all you need.
- **Safe for treated glass.** With no salts or aggressive components, it doesn't affect anti-reflective coatings, sealants or low-e glass.

## Applying it at height with a water-fed pole

Combined with carbon-fibre poles and soft-bristle brushes, reverse-osmosis water lets you clean windows up to 18 metres high **with no scaffolding or harnesses needed**. It's the technique used by 80% of façade-cleaning professionals in Europe.

### The zero-dry method

- A wet brush applies reverse-osmosis water to the glass.
- Accumulated dirt dissolves.
- The water runs off by gravity, carrying the grease with it.
- As it dries in the sun, not a single mark is left.

## Why don't we use it for everything?

Reverse-osmosis water has an energy and maintenance cost: the system needs filter changes every 6-12 months and a new membrane every 2-3 years. For a one-off clean at home, it's not worth it. For a professional cleaning business, it's the difference between an acceptable job and a flawless result.

## Is it the same as distilled water?

No. Distilled water is produced by evaporation-condensation and is very pure, but it's also expensive and strips out beneficial minerals if you drink it. Reverse-osmosis water is the practical choice for cleaning: it removes what stains and keeps a reasonable price.`,
      },
      fr: {
        title: "Qu'est-ce que l'eau pure osmosée ? La science derrière notre nettoyage",
        excerpt: "Zéro traces, zéro résidu, sans produits chimiques. On vous explique pourquoi les professionnels du monde entier utilisent l'eau osmosée pour nettoyer les vitres en hauteur.",
        dateLabel: "10 janvier 2026",
        body: `## Le problème de l'eau du robinet

L'eau qui sort de votre robinet contient entre 200 et 600 mg/l de sels minéraux (calcium, magnésium, sodium, potassium). En s'évaporant sur la vitre, ces sels forment une micro-couche blanchâtre. Ce sont ces "traces" que vous voyez même après un nettoyage en profondeur.

### Le test de la transparence

Si vous nettoyez une fenêtre à l'eau du robinet et la regardez à contre-jour, vous verrez des auréoles. Faites de même avec de l'eau osmosée, et vous ne verrez rien. La différence n'est pas une question de chance, c'est de la physique.

## Qu'est-ce qui la rend "pure" ?

L'eau osmosée a traversé un système d'**osmose inverse** à 4 ou 5 étages qui élimine entre 95 % et 99 % des minéraux et sels dissous. Ce qui reste est, techniquement, de l'H₂O quasi pure, avec une conductivité inférieure à 10 microsiemens/cm.

### Les 4 étapes du système

- **Filtre à sédiments.** Retient les particules en suspension (5 microns).
- **Filtre à charbon actif.** Élimine le chlore et les composés organiques.
- **Membrane d'osmose.** Le cœur du système. L'eau est forcée à travers une membrane semi-perméable qui ne laisse passer que les molécules d'H₂O.
- **Post-filtre de finition.** Parfait le goût et la pureté de l'eau.

## Avantages pratiques en nettoyage professionnel

- **Aucun résidu en séchant.** En s'évaporant, aucun minéral n'est laissé, la vitre est donc parfaite sans repassage.
- **Dissout mieux les salissures grasses.** Étant une eau "vide", elle tend à s'équilibrer en absorbant ce qui l'entoure, y compris la graisse et la poussière.
- **Permet de nettoyer sans produits chimiques.** Pour la plupart des vitrages, l'eau osmosée et une bonne raclette suffisent.
- **Sûre pour les vitrages traités.** Sans sels ni composants agressifs, elle n'affecte ni les couches anti-reflet, ni les joints, ni les vitrages à isolation renforcée.

## Application en hauteur avec perche télescopique

Combinée à des perches en carbone et des brosses à poils souples, l'eau osmosée permet de nettoyer des vitres jusqu'à 18 mètres de hauteur **sans échafaudage ni harnais**. C'est la technique utilisée par 80 % des professionnels du nettoyage de façades en Europe.

### La méthode sans séchage manuel

- Une brosse humide applique l'eau osmosée sur la vitre.
- La saleté accumulée se dissout.
- L'eau s'écoule par gravité, emportant la graisse.
- En séchant au soleil, il ne reste pas la moindre trace.

## Pourquoi ne pas l'utiliser pour tout ?

L'eau osmosée a un coût énergétique et d'entretien : le système doit changer de filtres tous les 6 à 12 mois et de membrane tous les 2 à 3 ans. Pour un nettoyage ponctuel à la maison, ce n'est pas rentable. Pour une entreprise de nettoyage professionnel, c'est la différence entre un travail acceptable et un résultat impeccable.

## Est-ce de l'eau distillée ?

Non. L'eau distillée est produite par évaporation-condensation et est très pure, mais elle est aussi chère et élimine des minéraux bénéfiques si vous la buvez. L'eau osmosée est l'option pratique pour le nettoyage : elle élimine ce qui tache tout en restant à un prix raisonnable.`,
      },
      de: {
        title: "Was ist reines Osmosewasser? Die Wissenschaft hinter unserer Reinigung",
        excerpt: "Keine Flecken, keine Rückstände, keine Chemie. Wir erklären, warum Profis weltweit Osmosewasser zur Reinigung von Fenstern in der Höhe verwenden.",
        dateLabel: "10. Januar 2026",
        body: `## Das Problem mit Leitungswasser

Das Wasser aus Ihrem Hahn enthält zwischen 200 und 600 mg/l Mineralsalze (Kalzium, Magnesium, Natrium, Kalium). Beim Verdunsten auf dem Glas bilden diese Salze eine weißliche Mikroschicht. Das sind die "Flecken", die Sie auch nach gründlichem Putzen sehen.

### Der Transparenz-Test

Putzen Sie ein Fenster mit Leitungswasser und halten es gegen das Licht, sehen Sie Schlieren. Machen Sie dasselbe mit Osmosewasser, sehen Sie nichts. Der Unterschied ist kein Zufall – es ist Physik.

## Was macht es "rein"?

Osmosewasser hat ein 4- oder 5-stufiges **Umkehrosmose**-System durchlaufen, das zwischen 95 % und 99 % der gelösten Mineralien und Salze entfernt. Was übrig bleibt, ist technisch fast reines H₂O mit einer Leitfähigkeit unter 10 Mikrosiemens/cm.

### Die 4 Stufen des Systems

- **Sedimentfilter.** Entfernt Schwebstoffe (5 Mikrometer).
- **Aktivkohlefilter.** Entfernt Chlor und organische Verbindungen.
- **Osmosemembran.** Das Herzstück des Systems. Das Wasser wird durch eine semipermeable Membran gepresst, die nur H₂O-Moleküle durchlässt.
- **Nachfilter zur Politur.** Verfeinert Geschmack und Reinheit des Wassers.

## Praktische Vorteile bei der professionellen Reinigung

- **Keine Rückstände beim Trocknen.** Beim Verdunsten bleiben keine Mineralien zurück, das Glas ist ohne Nacharbeit perfekt.
- **Löst fetten Schmutz besser.** Als "leeres" Wasser gleicht es sich aus, indem es alles um sich herum aufnimmt, einschließlich Fett und Staub.
- **Ermöglicht Reinigung ohne Chemikalien.** Bei den meisten Verglasungen reichen Osmosewasser und ein guter Abzieher aus.
- **Sicher für beschichtetes Glas.** Ohne Salze oder aggressive Bestandteile beeinträchtigt es weder Antireflexbeschichtungen noch Dichtungen oder Low-E-Glas.

## Anwendung in der Höhe mit der Teleskopstange

Kombiniert mit Karbonstangen und weichen Bürsten ermöglicht Osmosewasser die Reinigung von Fenstern bis zu 18 Metern Höhe **ohne Gerüst oder Gurte**. Diese Technik nutzen 80 % der Fassadenreinigungsprofis in Europa.

### Die Null-Trocken-Methode

- Eine feuchte Bürste trägt Osmosewasser auf das Glas auf.
- Angesammelter Schmutz löst sich.
- Das Wasser läuft durch die Schwerkraft ab und nimmt das Fett mit.
- Beim Trocknen in der Sonne bleibt keine einzige Spur zurück.

## Warum verwenden wir es nicht für alles?

Osmosewasser hat Energie- und Wartungskosten: Das System benötigt alle 6-12 Monate neue Filter und alle 2-3 Jahre eine neue Membran. Für eine einmalige Reinigung zu Hause lohnt es sich nicht. Für ein professionelles Reinigungsunternehmen ist es der Unterschied zwischen einer akzeptablen Arbeit und einem makellosen Ergebnis.

## Ist es destilliertes Wasser?

Nein. Destilliertes Wasser entsteht durch Verdampfung-Kondensation und ist sehr rein, aber auch teuer und entzieht beim Trinken nützliche Mineralien. Osmosewasser ist die praktische Wahl für die Reinigung: Es entfernt, was Flecken verursacht, und bleibt dabei preislich vernünftig.`,
      },
      ru: {
        title: "Что такое чистая осмотическая вода? Наука, стоящая за нашей чисткой",
        excerpt: "Ноль разводов, ноль остатков, без химии. Рассказываем, почему специалисты по всему миру используют осмотическую воду для мытья окон на высоте.",
        dateLabel: "10 января 2026 г.",
        body: `## Проблема водопроводной воды

Вода из вашего крана содержит от 200 до 600 мг/л минеральных солей (кальций, магний, натрий, калий). Испаряясь на стекле, эти соли образуют беловатый микрослой. Это те самые «разводы», которые видны даже после тщательной мойки.

### Тест на прозрачность

Если помыть окно водопроводной водой и посмотреть на просвет, вы увидите разводы. Сделайте то же с осмотической водой — и не увидите ничего. Разница не в везении, а в физике.

## Что делает её «чистой»?

Осмотическая вода прошла через 4- или 5-ступенчатую систему **обратного осмоса**, удаляющую от 95% до 99% растворённых минералов и солей. То, что остаётся, технически представляет собой почти чистую H₂O с проводимостью менее 10 микросименс/см.

### 4 ступени системы

- **Осадочный фильтр.** Удаляет взвешенные частицы (5 микрон).
- **Угольный фильтр.** Удаляет хлор и органические соединения.
- **Осмотическая мембрана.** Сердце системы. Вода проходит через полупроницаемую мембрану, пропускающую только молекулы H₂O.
- **Финальный полирующий фильтр.** Доводит вкус и чистоту воды до совершенства.

## Практическая польза в профессиональной чистке

- **Не оставляет следов при высыхании.** При испарении минералов не остаётся, стекло идеально без повторной протирки.
- **Лучше растворяет жирную грязь.** Будучи «пустой» водой, она стремится к равновесию, впитывая всё вокруг, включая жир и пыль.
- **Позволяет мыть без химии.** Для большинства стёкол достаточно осмотической воды и хорошей стяжки.
- **Безопасна для обработанных стёкол.** Без солей и агрессивных компонентов не влияет на антибликовые покрытия, герметики и энергосберегающие стёкла.

## Применение на высоте с телескопической штангой

В сочетании с карбоновыми штангами и мягкими щётками осмотическая вода позволяет мыть окна на высоте до 18 метров **без лесов и страховочных систем**. Эту технику используют 80% специалистов по мойке фасадов в Европе.

### Метод без ручной сушки

- Влажная щётка наносит осмотическую воду на стекло.
- Накопившаяся грязь растворяется.
- Вода стекает под действием силы тяжести, унося с собой жир.
- Высыхая на солнце, не оставляет ни единого следа.

## Почему мы не используем её для всего?

Осмотическая вода требует затрат на энергию и обслуживание: фильтры нужно менять каждые 6-12 месяцев, а мембрану — каждые 2-3 года. Для разовой уборки дома это невыгодно. Для профессиональной клининговой компании это разница между приемлемой работой и безупречным результатом.

## Это дистиллированная вода?

Нет. Дистиллированная вода производится испарением-конденсацией, она очень чистая, но также дорогая и лишает полезных минералов при питье. Осмотическая вода — практичный выбор для чистки: она устраняет загрязнения и остаётся доступной по цене.`,
      },
    },
  },
  {
    slug: "calendario-limpieza-mediterraneo",
    published: 1,
    categorySlug: "clima-costa-blanca",
    tags: ["clima", "costa-blanca", "mantenimiento", "temporada"],
    i18n: {
      en: {
        title: "Cleaning Calendar: How Often Should You Clean Windows by Season in the Mediterranean?",
        excerpt: "The Mediterranean sets the pace: calima in spring, sea salt in summer, wind in autumn. Here's when to clean each window according to the season.",
        dateLabel: "April 23, 2026",
        body: `## The Mediterranean is a 4-challenge calendar

The Costa Blanca climate isn't stable: it has four faces that affect your windows differently. What works in June doesn't work in October.

## Spring: calima takes charge

- March to May: peak Saharan calima.
- Outdoor windows: check every 14 days.
- Windows at height: check every 21 days.
- Preventive anti-calima treatment at the start of the season.

## Summer: sea salt and sun

- June to September: active sea salt, fast evaporation.
- Light exterior cleaning: every 10 days.
- Apply anti-salt sealant at the start of summer.
- Avoid cleaning in direct sun: heat dries too fast and leaves halos.

## Autumn: wind and acid rain

- October and November: easterly storms.
- Outdoor windows: every 7 days if exposed.
- Frame and joint cleaning: every 30 days.
- Check seals and weatherstripping before the first rains.

## Winter: condensation and mould

- December to February: indoor humidity + heating.
- Indoor windows: cleaning every 14 days.
- Watch for condensation on double glazing.
- Don't clean windows with a temperature difference above 15°C.

## The rule of 4 window types

1. **Exterior facing the sea:** every 10-15 days.
2. **Exterior facing inland or a patio:** every 21-30 days.
3. **Heavily used interior:** every 14 days.
4. **Low-maintenance interior:** every 30-45 days.

## The annual plan in 5 minutes

- January: general check-up and anti-salt sealing.
- April: anti-calima treatment.
- July: summer maintenance.
- October: storm preparation.
- And before each stage: bring in a professional.

## Why this order?

Because the aggressive agents of the Mediterranean climate don't attack all at once. Calima arrives before sea salt, and wind before acid rain. If you anticipate the agent, you reduce its effect.`,
      },
      fr: {
        title: "Calendrier de nettoyage : à quelle fréquence nettoyer selon la saison en Méditerranée ?",
        excerpt: "La Méditerranée donne le rythme : calima au printemps, embruns en été, vent en automne. On vous dit quand nettoyer chaque vitre selon la saison.",
        dateLabel: "23 avril 2026",
        body: `## La Méditerranée, un calendrier à 4 défis

Le climat de la Costa Blanca n'est pas stable : il a quatre visages qui affectent vos vitres différemment. Ce qui fonctionne en juin ne marche pas en octobre.

## Printemps : la calima commande

- Mars à mai : pics de calima saharienne.
- Vitres extérieures : contrôle tous les 14 jours.
- Vitres en hauteur : contrôle tous les 21 jours.
- Traitement anti-calima préventif en début de saison.

## Été : embruns salins et soleil

- Juin à septembre : dépôt salin actif, évaporation rapide.
- Nettoyage extérieur léger : tous les 10 jours.
- Application du scellant anti-sel en début d'été.
- Éviter de nettoyer en plein soleil : la chaleur sèche trop vite et laisse des auréoles.

## Automne : vent et pluies acides

- Octobre et novembre : tempêtes de levant.
- Vitres extérieures : tous les 7 jours si exposées.
- Nettoyage des cadres et joints : tous les 30 jours.
- Vérifier les joints et l'étanchéité avant les premières pluies.

## Hiver : condensation et moisissure

- Décembre à février : humidité intérieure + chauffage.
- Vitres intérieures : nettoyage tous les 14 jours.
- Attention à la condensation sur le double vitrage.
- Ne pas nettoyer de vitres avec un écart de température supérieur à 15 °C.

## La règle des 4 types de vitres

1. **Extérieure exposée à la mer :** tous les 10-15 jours.
2. **Extérieure côté terre ou patio :** tous les 21-30 jours.
3. **Intérieure très utilisée :** tous les 14 jours.
4. **Intérieure à entretien réduit :** tous les 30-45 jours.

## Le plan annuel en 5 minutes

- Janvier : révision générale et scellage anti-sel.
- Avril : traitement anti-calima.
- Juillet : entretien d'été.
- Octobre : préparation aux tempêtes.
- Et avant chaque étape : faire appel à un professionnel.

## Pourquoi cet ordre ?

Parce que les agents agressifs du climat méditerranéen n'attaquent pas en même temps. La calima arrive avant les embruns et le vent avant la pluie acide. Anticiper l'agent, c'est réduire son effet.`,
      },
      de: {
        title: "Reinigungskalender: Wie oft sollten Fenster je nach Jahreszeit im Mittelmeerraum gereinigt werden?",
        excerpt: "Das Mittelmeer gibt den Takt vor: Calima im Frühling, Salz im Sommer, Wind im Herbst. Wir sagen Ihnen, wann Sie welches Fenster je nach Jahreszeit reinigen sollten.",
        dateLabel: "23. April 2026",
        body: `## Das Mittelmeer ist ein Kalender mit 4 Herausforderungen

Das Klima der Costa Blanca ist nicht stabil: Es hat vier Gesichter, die Ihre Fenster unterschiedlich beeinflussen. Was im Juni funktioniert, klappt im Oktober nicht.

## Frühling: Calima bestimmt das Geschehen

- März bis Mai: Höhepunkte des Saharastaubs.
- Außenfenster: Kontrolle alle 14 Tage.
- Fenster in der Höhe: Kontrolle alle 21 Tage.
- Vorbeugende Anti-Calima-Behandlung zu Saisonbeginn.

## Sommer: Salz und Sonne

- Juni bis September: aktive Salzablagerung, schnelle Verdunstung.
- Leichte Außenreinigung: alle 10 Tage.
- Anti-Salz-Versiegelung zu Sommerbeginn auftragen.
- Reinigung in praller Sonne vermeiden: Hitze trocknet zu schnell und hinterlässt Schlieren.

## Herbst: Wind und saurer Regen

- Oktober und November: Oststürme.
- Außenfenster: alle 7 Tage bei Exposition.
- Reinigung von Rahmen und Fugen: alle 30 Tage.
- Dichtungen vor den ersten Regenfällen prüfen.

## Winter: Kondensation und Schimmel

- Dezember bis Februar: Innenfeuchtigkeit + Heizung.
- Innenfenster: Reinigung alle 14 Tage.
- Auf Kondensation bei Doppelverglasung achten.
- Keine Fenster mit Temperaturunterschied über 15 °C reinigen.

## Die Regel der 4 Fenstertypen

1. **Außen zum Meer hin:** alle 10-15 Tage.
2. **Außen landeinwärts oder zum Innenhof:** alle 21-30 Tage.
3. **Stark genutzt innen:** alle 14 Tage.
4. **Innen mit geringem Wartungsbedarf:** alle 30-45 Tage.

## Der Jahresplan in 5 Minuten

- Januar: Generalüberprüfung und Anti-Salz-Versiegelung.
- April: Anti-Calima-Behandlung.
- Juli: Sommerwartung.
- Oktober: Vorbereitung auf Stürme.
- Und vor jeder Etappe: einen Fachmann hinzuziehen.

## Warum diese Reihenfolge?

Weil die aggressiven Faktoren des Mittelmeerklimas nicht gleichzeitig angreifen. Calima kommt vor dem Salz, und der Wind vor dem sauren Regen. Wer den Faktor vorwegnimmt, verringert seine Wirkung.`,
      },
      ru: {
        title: "Календарь уборки: как часто мыть окна в зависимости от сезона на Средиземноморье?",
        excerpt: "Средиземноморье задаёт ритм: калима весной, соль летом, ветер осенью. Рассказываем, когда мыть каждое окно в зависимости от сезона.",
        dateLabel: "23 апреля 2026 г.",
        body: `## Средиземноморье — календарь четырёх испытаний

Климат Коста-Бланки нестабилен: у него четыре лица, по-разному влияющие на ваши окна. То, что работает в июне, не подходит в октябре.

## Весна: калима диктует правила

- С марта по май: пики сахарской калимы.
- Наружные окна: проверка каждые 14 дней.
- Окна на высоте: проверка каждые 21 день.
- Профилактическая обработка от калимы в начале сезона.

## Лето: соль и солнце

- С июня по сентябрь: активный солевой налёт, быстрое испарение.
- Лёгкая наружная чистка: каждые 10 дней.
- Нанесение защиты от соли в начале лета.
- Избегайте мытья под прямым солнцем: жара слишком быстро сушит средство и оставляет разводы.

## Осень: ветер и кислотные дожди

- Октябрь и ноябрь: восточные штормы.
- Наружные окна: каждые 7 дней при воздействии осадков.
- Чистка рам и стыков: каждые 30 дней.
- Проверьте уплотнители и герметизацию перед первыми дождями.

## Зима: конденсат и плесень

- С декабря по февраль: влажность в помещении + отопление.
- Внутренние окна: чистка каждые 14 дней.
- Обратите внимание на конденсат на стеклопакетах.
- Не мойте окна при перепаде температур более 15 °C.

## Правило 4 типов окон

1. **Наружное, выходящее на море:** каждые 10-15 дней.
2. **Наружное со стороны суши или патио:** каждые 21-30 дней.
3. **Внутреннее с интенсивным использованием:** каждые 14 дней.
4. **Внутреннее с минимальным обслуживанием:** каждые 30-45 дней.

## Годовой план за 5 минут

- Январь: общий осмотр и защита от соли.
- Апрель: обработка от калимы.
- Июль: летнее обслуживание.
- Октябрь: подготовка к штормам.
- И перед каждым этапом: обращайтесь к специалисту.

## Почему именно такой порядок?

Потому что агрессивные факторы средиземноморского климата атакуют не одновременно. Калима приходит раньше соли, а ветер — раньше кислотных дождей. Если предвидеть фактор заранее, его воздействие снижается.`,
      },
    },
  },
  {
    slug: "checklist-seguridad-cristales-altura",
    published: 1,
    categorySlug: "negocios-hoteles",
    tags: ["negocios", "altura", "seguridad"],
    i18n: {
      en: {
        title: "Safety Checklist: What to Demand from a Window Cleaning Company Working at Height",
        excerpt: "What a serious high-rise cleaning company must show you before climbing your façade. A 12-point list that separates professionals from risk-takers.",
        dateLabel: "March 19, 2026",
        body: `## Why a checklist?

Cleaning windows at height is the highest-risk operation in building maintenance. It's not a job for "a friend with a harness". Any company bidding for your job must pass these 12 points.

## Before you sign

1. **Public liability insurance** of at least €600,000.
2. **Safe work plan** signed by a competent technician.
3. **Risk assessment** specific to the building.
4. **PPE certification**: harness, helmet, lifeline, connectors.
5. **Accredited training** for the operators (20h minimum + annual refresher).
6. **First-aid kit and rescue equipment** on site.
7. **Certified anchor system** (EN 795) for each façade.
8. **Council permit** if the façade touches a public road.
9. **Coordination with the community** or building manager.
10. **Emergency plan** with phone numbers and evacuation points.
11. **Communication equipment** between the operator at height and the ground.
12. **Accident insurance** specific to the workers.

## Warning signs

- "Don't worry, we've done it this way for years" → no.
- A quote with no breakdown of resources → no.
- No signed work plan → no.
- Operators without an accredited course → no.
- A price 30% below the market rate → no.

## Figures that matter

Spain sees around 50 serious accidents a year in vertical work, according to the INSST (Spanish National Institute for Safety and Health at Work). Half occur at companies without proper training. Cleaning windows at height isn't "going down on a rope" — it's a technical operation with its own regulations.

## What to ask

- Who is the on-site prevention officer?
- How often are the harnesses inspected?
- Do they have an accident history?
- Can I see the last signed work plan?
- What happens if it rains halfway through the day?

## The correct contract wording

Any serious company will accept in writing:

- Work suspended for wind above 40 km/h.
- Resumption only under safe conditions.
- Replacement of the operator if the technician deems it necessary.
- Third-party damage insurance included.

## At Limpiezas Luz de Luna

- Height work complying with UNE-EN 795.
- Operators with a 60-hour course and annual refresher.
- €1,200,000 public liability insurance.
- Work plan signed by a health-and-safety technician.
- And if the wind picks up, we stop. No exceptions.`,
      },
      fr: {
        title: "Checklist de sécurité : ce qu'il faut exiger d'une entreprise de nettoyage de vitres en hauteur",
        excerpt: "Ce qu'une entreprise sérieuse de nettoyage en hauteur doit vous montrer avant de monter sur votre façade. Une liste de 12 points qui sépare les professionnels des amateurs de risque.",
        dateLabel: "19 mars 2026",
        body: `## Pourquoi une checklist ?

Le nettoyage de vitres en hauteur est l'opération la plus risquée dans l'entretien d'un bâtiment. Ce n'est pas un travail pour "un ami avec un harnais". Toute entreprise qui vous soumet un devis doit satisfaire ces 12 points.

## Avant de signer

1. **Assurance RC** d'au moins 600 000 €.
2. **Plan de travail sécurisé** signé par un technicien compétent.
3. **Évaluation des risques** propre au bâtiment.
4. **Certification des EPI** : harnais, casque, ligne de vie, connecteurs.
5. **Formation certifiée** des opérateurs (20 h minimum + recyclage annuel).
6. **Trousse de secours et moyens de sauvetage** sur le chantier.
7. **Système d'ancrage certifié** (EN 795) pour chaque façade.
8. **Autorisation municipale** si la façade donne sur la voie publique.
9. **Coordination avec la copropriété** ou le gestionnaire.
10. **Plan d'urgence** avec numéros de téléphone et points d'évacuation.
11. **Moyens de communication** entre l'opérateur en hauteur et le sol.
12. **Assurance accidents** spécifique aux travailleurs.

## Signaux d'alerte

- "Ne vous inquiétez pas, on fait comme ça depuis des années" → non.
- Un devis sans détail des moyens → non.
- Pas de plan de travail signé → non.
- Opérateurs sans formation certifiée → non.
- Un prix 30 % sous le marché → non.

## Des chiffres qui comptent

L'Espagne enregistre environ 50 accidents graves par an dans les travaux verticaux, selon l'INSST. La moitié survient dans des entreprises sans formation adéquate. Nettoyer des vitres en hauteur, ce n'est pas "descendre avec une corde" : c'est une opération technique avec sa propre réglementation.

## Que demander

- Qui est le référent prévention sur le chantier ?
- À quelle fréquence les harnais sont-ils contrôlés ?
- Ont-ils un historique d'accidents ?
- Puis-je voir le dernier plan de travail signé ?
- Que se passe-t-il s'il pleut en milieu de journée ?

## La bonne rédaction du contrat

Toute entreprise sérieuse accepte par contrat :

- La suspension du travail au-delà de 40 km/h de vent.
- La reprise uniquement dans des conditions sûres.
- Le remplacement de l'opérateur si le technicien le juge nécessaire.
- L'assurance dommages aux tiers incluse.

## Chez Limpiezas Luz de Luna

- Travaux en hauteur conformes à la norme UNE-EN 795.
- Opérateurs formés 60 h avec recyclage annuel.
- Assurance RC de 1 200 000 €.
- Plan de travail signé par un technicien PRL.
- Et si le vent forcit, on s'arrête. Sans exception.`,
      },
      de: {
        title: "Sicherheits-Checkliste: Was Sie von einer Firma für Fensterreinigung in der Höhe verlangen sollten",
        excerpt: "Was Ihnen ein seriöses Unternehmen für Höhenreinigung zeigen muss, bevor es an Ihrer Fassade arbeitet. Eine 12-Punkte-Liste, die Profis von Risikofreudigen unterscheidet.",
        dateLabel: "19. März 2026",
        body: `## Warum eine Checkliste?

Die Reinigung von Fenstern in der Höhe ist der risikoreichste Vorgang bei der Gebäudewartung. Das ist keine Arbeit für "einen Freund mit Gurt". Jedes Unternehmen, das Ihnen ein Angebot macht, muss diese 12 Punkte erfüllen.

## Vor der Unterschrift

1. **Haftpflichtversicherung** von mindestens 600.000 €.
2. **Sicherer Arbeitsplan**, unterzeichnet von einem qualifizierten Techniker.
3. **Gefährdungsbeurteilung** speziell für das Gebäude.
4. **Zertifizierte PSA**: Gurt, Helm, Sicherungsseil, Verbinder.
5. **Anerkannte Ausbildung** der Mitarbeiter (mindestens 20 Std. + jährliche Auffrischung).
6. **Erste-Hilfe-Set und Rettungsmittel** vor Ort.
7. **Zertifiziertes Verankerungssystem** (EN 795) für jede Fassade.
8. **Städtische Genehmigung**, falls die Fassade an öffentlichen Grund grenzt.
9. **Abstimmung mit der Eigentümergemeinschaft** oder Hausverwaltung.
10. **Notfallplan** mit Telefonnummern und Evakuierungspunkten.
11. **Kommunikationsmittel** zwischen Mitarbeiter in der Höhe und Boden.
12. **Unfallversicherung** speziell für die Arbeiter.

## Warnsignale

- "Keine Sorge, wir machen das seit Jahren so" → nein.
- Ein Angebot ohne Aufschlüsselung der Mittel → nein.
- Kein unterzeichneter Arbeitsplan → nein.
- Mitarbeiter ohne anerkannten Kurs → nein.
- Ein Preis 30 % unter dem Marktniveau → nein.

## Zahlen, die zählen

In Spanien ereignen sich laut INSST jährlich rund 50 schwere Unfälle bei Höhenarbeiten. Die Hälfte davon bei Unternehmen ohne angemessene Ausbildung. Fenster in der Höhe zu reinigen bedeutet nicht "an einem Seil herunterzulassen" – es ist ein technischer Vorgang mit eigenen Vorschriften.

## Was Sie fragen sollten

- Wer ist die Präventionsfachkraft vor Ort?
- Wie oft werden die Gurte überprüft?
- Gibt es eine Unfallhistorie?
- Kann ich den letzten unterzeichneten Arbeitsplan sehen?
- Was passiert, wenn es mitten am Tag regnet?

## Die richtige Vertragsformulierung

Jedes seriöse Unternehmen akzeptiert vertraglich:

- Arbeitsunterbrechung bei Wind über 40 km/h.
- Wiederaufnahme nur unter sicheren Bedingungen.
- Austausch des Mitarbeiters, wenn der Techniker dies für nötig hält.
- Inbegriffene Haftpflichtversicherung für Schäden Dritter.

## Bei Limpiezas Luz de Luna

- Höhenarbeiten gemäß UNE-EN 795.
- Mitarbeiter mit 60-Stunden-Kurs und jährlicher Auffrischung.
- Haftpflichtversicherung über 1.200.000 €.
- Arbeitsplan, unterzeichnet von einer Fachkraft für Arbeitssicherheit.
- Und wenn der Wind zu stark wird, stoppen wir. Ohne Ausnahme.`,
      },
      ru: {
        title: "Чек-лист безопасности: что нужно требовать от компании по мойке окон на высоте",
        excerpt: "Что серьёзная компания по мойке фасадов на высоте обязана показать вам перед началом работ. Список из 12 пунктов, отделяющий профессионалов от любителей риска.",
        dateLabel: "19 марта 2026 г.",
        body: `## Зачем нужен чек-лист?

Мойка окон на высоте — операция с наибольшим риском при обслуживании здания. Это не работа для «друга со страховкой». Любая компания, предлагающая вам смету, должна соответствовать этим 12 пунктам.

## Перед подписанием договора

1. **Страхование гражданской ответственности** минимум на 600 000 €.
2. **План безопасной работы**, подписанный компетентным специалистом.
3. **Оценка рисков**, специфичная для данного здания.
4. **Сертификация СИЗ**: страховочная привязь, каска, страховочный трос, соединители.
5. **Подтверждённое обучение** персонала (минимум 20 часов + ежегодное повышение квалификации).
6. **Аптечка и средства спасения** на объекте.
7. **Сертифицированная система анкеровки** (EN 795) для каждого фасада.
8. **Разрешение муниципалитета**, если фасад выходит на общественную дорогу.
9. **Согласование с ТСЖ** или управляющей компанией.
10. **План действий в чрезвычайной ситуации** с телефонами и точками эвакуации.
11. **Средства связи** между работником на высоте и землёй.
12. **Страхование от несчастных случаев** для работников.

## Тревожные признаки

- «Не волнуйтесь, мы так работаем уже много лет» → нет.
- Смета без детализации ресурсов → нет.
- Отсутствие подписанного плана работ → нет.
- Работники без подтверждённого обучения → нет.
- Цена на 30% ниже рыночной → нет.

## Цифры, которые важны

В Испании происходит около 50 серьёзных несчастных случаев в год при работе на высоте, по данным INSST. Половина из них — в компаниях без должного обучения. Мойка окон на высоте — это не «спуститься на верёвке», а техническая операция со своими нормативами.

## Что спросить

- Кто отвечает за безопасность на объекте?
- Как часто проверяются страховочные системы?
- Есть ли у компании история несчастных случаев?
- Можно ли увидеть последний подписанный план работ?
- Что происходит, если посреди рабочего дня начинается дождь?

## Правильная формулировка договора

Любая серьёзная компания примет в договоре:

- Приостановку работ при ветре свыше 40 км/ч.
- Возобновление только при безопасных условиях.
- Замену работника, если специалист сочтёт это необходимым.
- Включённое страхование ответственности перед третьими лицами.

## В Limpiezas Luz de Luna

- Работы на высоте согласно UNE-EN 795.
- Работники с 60-часовым курсом и ежегодным повышением квалификации.
- Страхование ответственности на 1 200 000 €.
- План работ, подписанный специалистом по охране труда.
- И если ветер усиливается, мы останавливаемся. Без исключений.`,
      },
    },
  },
  {
    slug: "mantenimiento-preventivo-vidrios",
    published: 1,
    categorySlug: "negocios-hoteles",
    tags: ["negocios", "mantenimiento", "vidrio"],
    i18n: {
      en: {
        title: "Preventive Maintenance: Save Money on Replacing Damaged Glass",
        excerpt: "Replacing a 2 m² façade glass panel costs between €800 and €1,500. A preventive plan costs a fraction of that and extends the glass's lifespan by up to 10 more years.",
        dateLabel: "March 26, 2026",
        body: `## The real cost of a broken pane

When a pane breaks on a façade, the cost isn't just the glass. You also have to add:

- Crane or scaffolding to access it.
- Glazier's labour.
- Provisional safety enclosure.
- Material lead time and waiting.
- Possible business interruption.

The typical bill runs between €800 and €1,500 depending on height and glass type. Not counting reputational cost or the hassle.

## What ages a pane of glass

- **Degraded seals:** let in moisture and salts.
- **Accumulated micro-scratching:** from aggressive cleaning or calima.
- **Loose anchors:** vibration and wind gradually loosen the fittings.
- **Cracked perimeter sealant:** encourages water ingress.
- **Stuck-on grime:** permanent haziness if left untreated.

## The preventive plan in 4 reviews

### Review 1 (March) — pre-calima

- Inspection of joints and seals.
- Anchor test with a dynamometer.
- Deep cleaning of frames.
- Anti-calima sealant application.

### Review 2 (June) — pre-sea-salt

- Full exterior clean.
- Weatherstripping check.
- Anti-salt treatment application.
- Frame drainage check.

### Review 3 (October) — pre-storms

- Crack inspection.
- Water-tightness test.
- Anchor touch-up.
- Gutter and frame cleaning.

### Review 4 (December) — pre-cold

- Interior joint check.
- Condensation detection.
- Locks and shutters review.
- Action plan for the following year.

## The ROI of maintenance

Buildings with an annual preventive plan see:

- Glass lifespan: +8 to 12 years.
- Average annual cost: €0.8 to 1.5/m².
- Savings on replacements: 60-70%.
- Reduction in incidents: up to 80%.

## When you shouldn't wait

- Glass with opaque stains that won't come off.
- Joints that crumble to the touch.
- Visible anchors with signs of rust.
- Vibration noise in the wind.
- Any crack, however small.

## For property managers

If you manage a portfolio of buildings, centralise the plan:

- A single supplier with a track record.
- Annual reports per building.
- A closed annual budget vs. one-off intervention.
- Lower cost and better traceability.

## At Limpiezas Luz de Luna

We work with property managers and administrators across the Marina Baixa. Our annual preventive plan covers 4 scheduled technical reviews plus unlimited call-out intervention. Ask us with no obligation.`,
      },
      fr: {
        title: "Maintenance préventive : économisez sur le remplacement des vitrages endommagés",
        excerpt: "Remplacer un vitrage de 2 m² en façade coûte entre 800 € et 1 500 €. Un plan préventif coûte une fraction de ce prix et prolonge la durée de vie du verre jusqu'à 10 ans de plus.",
        dateLabel: "26 mars 2026",
        body: `## Le coût réel d'un vitrage cassé

Quand un vitrage se casse en façade, le coût ne se limite pas au verre. Il faut ajouter :

- Grue ou échafaudage pour y accéder.
- Main-d'œuvre du vitrier.
- Fermeture provisoire de sécurité.
- Réception du matériel et temps d'attente.
- Interruption possible de l'activité.

La facture habituelle oscille entre 800 € et 1 500 € selon la hauteur et le type de vitrage. Sans compter le coût réputationnel ni la gêne occasionnée.

## Ce qui vieillit un vitrage

- **Joints dégradés :** laissent entrer humidité et sels.
- **Micro-rayures accumulées :** dues à un nettoyage agressif ou à la calima.
- **Ancrages desserrés :** vibrations et vent desserrent peu à peu les fixations.
- **Joint périphérique fissuré :** favorise l'infiltration d'eau.
- **Saleté incrustée :** opacité permanente si non traitée.

## Le plan préventif en 4 révisions

### Révision 1 (mars) — pré-calima

- Inspection des joints et scellements.
- Test des ancrages au dynamomètre.
- Nettoyage en profondeur des cadres.
- Application du scellant anti-calima.

### Révision 2 (juin) — pré-embruns

- Nettoyage extérieur complet.
- Révision des joints d'étanchéité.
- Application de l'anti-sel.
- Vérification des évacuations de la feuillure.

### Révision 3 (octobre) — pré-tempêtes

- Inspection des fissures.
- Test d'étanchéité.
- Révision des ancrages.
- Nettoyage des gouttières et des cadres.

### Révision 4 (décembre) — pré-froid

- Révision des joints intérieurs.
- Détection de la condensation.
- Révision des fermetures et volets.
- Plan d'action pour l'année suivante.

## Le ROI de la maintenance

Les bâtiments avec un plan préventif annuel constatent :

- Durée de vie du verre : +8 à 12 ans.
- Coût annuel moyen : 0,8 à 1,5 €/m².
- Économies sur les remplacements : 60-70 %.
- Réduction des incidents : jusqu'à 80 %.

## Quand ne pas attendre

- Verre avec des taches opaques qui ne partent pas.
- Joints qui s'effritent au toucher.
- Ancrages visibles avec des traces de rouille.
- Bruits de vibration au vent.
- Toute fissure, même minime.

## Pour les property managers

Si vous gérez un portefeuille de bâtiments, centralisez le plan :

- Un fournisseur unique avec historique.
- Rapports annuels par bâtiment.
- Budget annuel fermé vs. intervention ponctuelle.
- Coût réduit et meilleure traçabilité.

## Chez Limpiezas Luz de Luna

Nous travaillons avec des syndics et gestionnaires immobiliers de la Marina Baixa. Notre plan préventif annuel couvre 4 révisions techniques programmées + intervention illimitée sur signalement. Renseignez-vous sans engagement.`,
      },
      de: {
        title: "Vorbeugende Wartung: Sparen Sie bei der Ersetzung beschädigter Verglasungen",
        excerpt: "Der Austausch einer 2 m² großen Fassadenverglasung kostet zwischen 800 € und 1.500 €. Ein Präventionsplan kostet einen Bruchteil davon und verlängert die Lebensdauer des Glases um bis zu 10 Jahre.",
        dateLabel: "26. März 2026",
        body: `## Die wahren Kosten einer zerbrochenen Scheibe

Wenn eine Scheibe an einer Fassade zerbricht, sind die Kosten nicht nur die des Glases. Hinzu kommen:

- Kran oder Gerüst für den Zugang.
- Arbeitszeit des Glasers.
- Provisorische Sicherheitsabsperrung.
- Materialbeschaffung und Wartezeit.
- Mögliche Betriebsunterbrechung.

Die übliche Rechnung liegt je nach Höhe und Glasart zwischen 800 € und 1.500 €. Ohne Reputationsschaden und Unannehmlichkeiten mitgerechnet.

## Was eine Scheibe altern lässt

- **Verschlissene Dichtungen:** lassen Feuchtigkeit und Salze eindringen.
- **Angesammelte Mikrokratzer:** durch aggressive Reinigung oder Calima.
- **Gelockerte Verankerungen:** Vibration und Wind lockern nach und nach die Halterungen.
- **Rissige Randversiegelung:** begünstigt das Eindringen von Wasser.
- **Anhaftender Schmutz:** dauerhafte Trübung, wenn unbehandelt.

## Der Präventionsplan in 4 Überprüfungen

### Überprüfung 1 (März) — vor der Calima

- Inspektion von Fugen und Dichtungen.
- Ankertest mit Dynamometer.
- Tiefenreinigung der Rahmen.
- Anti-Calima-Versiegelung auftragen.

### Überprüfung 2 (Juni) — vor der Salzsaison

- Komplette Außenreinigung.
- Überprüfung der Dichtungsgummis.
- Anti-Salz-Behandlung auftragen.
- Kontrolle der Falzentwässerung.

### Überprüfung 3 (Oktober) — vor Stürmen

- Rissinspektion.
- Dichtheitstest.
- Nacharbeit an Verankerungen.
- Reinigung von Dachrinnen und Rahmen.

### Überprüfung 4 (Dezember) — vor der Kälte

- Überprüfung der Innendichtungen.
- Kondensationserkennung.
- Überprüfung von Schlössern und Rollläden.
- Aktionsplan für das kommende Jahr.

## Der ROI der Wartung

Gebäude mit jährlichem Präventionsplan verzeichnen:

- Lebensdauer des Glases: +8 bis 12 Jahre.
- Durchschnittliche jährliche Kosten: 0,8 bis 1,5 €/m².
- Einsparung bei Ersatz: 60-70 %.
- Reduzierung von Vorfällen: bis zu 80 %.

## Wann Sie nicht warten sollten

- Glas mit undurchsichtigen Flecken, die nicht weggehen.
- Fugen, die sich beim Berühren zerbröseln.
- Sichtbare Verankerungen mit Rostspuren.
- Vibrationsgeräusche bei Wind.
- Jeder Riss, egal wie klein.

## Für Immobilienverwalter

Wenn Sie ein Gebäudeportfolio verwalten, zentralisieren Sie den Plan:

- Ein einziger Anbieter mit Erfahrungswerten.
- Jährliche Berichte pro Gebäude.
- Festes Jahresbudget statt Einzelmaßnahmen.
- Geringere Kosten und bessere Nachvollziehbarkeit.

## Bei Limpiezas Luz de Luna

Wir arbeiten mit Hausverwaltungen und Immobilienverwaltern in der Marina Baixa zusammen. Unser jährlicher Präventionsplan umfasst 4 geplante technische Überprüfungen plus unbegrenzte Einsätze auf Anfrage. Fragen Sie unverbindlich nach.`,
      },
      ru: {
        title: "Профилактическое обслуживание: экономьте на замене повреждённых стёкол",
        excerpt: "Замена фасадного стекла площадью 2 м² стоит от 800 до 1500 €. Профилактический план стоит в разы дешевле и продлевает срок службы стекла до 10 дополнительных лет.",
        dateLabel: "26 марта 2026 г.",
        body: `## Реальная стоимость разбитого стекла

Когда на фасаде разбивается стекло, расходы не ограничиваются самим стеклом. К ним добавляются:

- Кран или леса для доступа.
- Работа стекольщика.
- Временное защитное ограждение.
- Ожидание поставки материала.
- Возможный простой в работе бизнеса.

Обычный счёт составляет от 800 до 1500 € в зависимости от высоты и типа стекла. Не считая репутационных издержек и неудобств.

## Что старит стекло

- **Изношенные уплотнители:** пропускают влагу и соли.
- **Накопленные микроцарапины:** от агрессивной чистки или калимы.
- **Ослабленные крепления:** вибрация и ветер постепенно расшатывают фиксаторы.
- **Треснувший периметральный герметик:** способствует проникновению воды.
- **Прилипшая грязь:** постоянное помутнение при отсутствии обработки.

## Профилактический план из 4 проверок

### Проверка 1 (март) — перед калимой

- Осмотр стыков и герметиков.
- Тест креплений динамометром.
- Глубокая чистка рам.
- Нанесение защиты от калимы.

### Проверка 2 (июнь) — перед сезоном соли

- Полная наружная чистка.
- Проверка уплотнителей.
- Нанесение защиты от соли.
- Проверка дренажа фальцев.

### Проверка 3 (октябрь) — перед штормами

- Осмотр трещин.
- Тест на герметичность.
- Подтяжка креплений.
- Чистка водостоков и рам.

### Проверка 4 (декабрь) — перед холодами

- Проверка внутренних уплотнителей.
- Обнаружение конденсата.
- Проверка замков и жалюзи.
- План действий на следующий год.

## Окупаемость обслуживания

Здания с ежегодным профилактическим планом показывают:

- Срок службы стекла: +8-12 лет.
- Средняя годовая стоимость: 0,8-1,5 €/м².
- Экономия на замене: 60-70%.
- Снижение числа инцидентов: до 80%.

## Когда не стоит ждать

- Стекло с непрозрачными пятнами, которые не выводятся.
- Уплотнители, крошащиеся на ощупь.
- Видимые крепления со следами ржавчины.
- Вибрационный шум на ветру.
- Любая трещина, даже незначительная.

## Для управляющих недвижимостью

Если вы управляете портфелем зданий, централизуйте план:

- Единый поставщик с историей работы.
- Годовые отчёты по каждому зданию.
- Фиксированный годовой бюджет вместо разовых вмешательств.
- Меньшие затраты и лучшая прослеживаемость.

## В Limpiezas Luz de Luna

Мы работаем с управляющими компаниями и администраторами недвижимости в Марина-Байша. Наш годовой профилактический план включает 4 запланированные технические проверки плюс неограниченные выезды по заявке. Обращайтесь без обязательств.`,
      },
    },
  },
  {
    slug: "mantenimiento-cortinas-cristal",
    published: 1,
    categorySlug: "soluciones-hogar",
    tags: ["hogar", "mantenimiento", "salitre", "costa-blanca"],
    i18n: {
      en: {
        title: "Glass Curtains: How to Keep the Tracks and Glass Like New",
        excerpt: "Frameless glass curtains are trending on Costa Blanca terraces, but their tracks are dirt traps. Here's how to get them looking like new in 30 minutes.",
        dateLabel: "April 2, 2026",
        body: `## Why they get so dirty

Frameless glass curtains close off your terrace without vertical bars, gaining you a usable square metre and unobstructed views. But the track system (the guides the panels slide along) collects:

- Airborne dust.
- Construction debris.
- Beach sand.
- Salts from the sea air.
- Insects.

Over time, that mix compacts and the panels start sliding badly.

## How often to clean them

- **Tracks:** every 30-45 days.
- **Glass:** every 14-21 days.
- **Deep clean:** every 6 months.
- **Bearing check:** every 12 months.

## Materials you'll need

- Vacuum with a narrow nozzle.
- A stiff toothbrush.
- Microfibre cloth.
- Reverse-osmosis water or tap water with vinegar.
- Silicone spray lubricant (not greasy).
- Rubber squeegee.

## Method in 5 steps

1. **Open the panels** and remove the bottom seal from the track.
2. **Vacuum** the inside of the track with the narrow nozzle.
3. **Brush** off stuck-on debris with the toothbrush.
4. **Wipe** the bottom with a damp microfibre cloth using water and vinegar.
5. **Lubricate** the bearings with silicone spray.

## The glass

For the panels, follow the 3-step rule:

- Spray reverse-osmosis water.
- Wait 1 minute.
- Squeegee top to bottom without going over it again.

## Common mistakes

- Using strong soap: leaves a film that attracts more dust.
- Greasing the tracks instead of lubricating them: grease traps sand.
- Cleaning the track with a knife tip: scratches the anodised finish.
- Painting the track to "refresh" it: blocks the sliding motion.

## When to call a professional

- Panels that won't fit into the top latch.
- Bearings that squeak or stick.
- Tracks with visible rust.
- Worn-out bottom seals.
- Need to dismantle for internal frame-channel cleaning.

## Why does sea salt attack them more?

The Costa Blanca has a high salt content in the air. That salt crystallises in the bearings and seizes them up. If you notice the panels feeling "stiff", it's salt. Cleaning with warm water and 10% vinegar dissolves the crystals without affecting the anodised finish.

## Annual maintenance plan

- January: seal and bearing check.
- April: deep clean before calima season.
- July: bearing lubrication.
- October: construction-dust and summer-grime clean-up.`,
      },
      fr: {
        title: "Baies vitrées coulissantes : comment garder les rails et le verre comme au premier jour",
        excerpt: "Les baies vitrées coulissantes sans montants sont tendance sur les terrasses de la Costa Blanca, mais leurs rails sont de vrais pièges à saleté. On vous explique comment les remettre à neuf en 30 minutes.",
        dateLabel: "2 avril 2026",
        body: `## Pourquoi elles se salissent autant

Les baies vitrées coulissantes sans montants verticaux ferment votre terrasse tout en gagnant 1 m² utile et une vue dégagée. Mais le système de rails (les guides sur lesquels glissent les panneaux) accumule :

- De la poussière en suspension.
- Des résidus de chantier.
- Du sable de plage.
- Des sels de l'air marin.
- Des insectes.

Avec le temps, ce mélange se compacte et les panneaux commencent à mal glisser.

## À quelle fréquence les nettoyer

- **Rails :** tous les 30-45 jours.
- **Vitres :** tous les 14-21 jours.
- **Nettoyage en profondeur :** tous les 6 mois.
- **Révision des roulements :** tous les 12 mois.

## Le matériel nécessaire

- Aspirateur avec suceur fin.
- Brosse à dents dure.
- Chiffon microfibre.
- Eau osmosée ou eau du robinet avec vinaigre.
- Lubrifiant silicone en spray (non gras).
- Raclette en caoutchouc.

## Méthode en 5 étapes

1. **Ouvrez les panneaux** et retirez le joint inférieur du rail.
2. **Aspirez** l'intérieur du rail avec le suceur fin.
3. **Brossez** les résidus collés avec la brosse à dents.
4. **Passez une microfibre humide** avec eau et vinaigre sur le fond.
5. **Lubrifiez** les roulements avec le spray silicone.

## Le verre

Pour les panneaux, la règle des 3 étapes :

- Vaporiser de l'eau osmosée.
- Attendre 1 minute.
- Passer la raclette de haut en bas sans repasser.

## Erreurs fréquentes

- Utiliser un savon fort : laisse un film qui attire plus de poussière.
- Graisser les rails au lieu de les lubrifier : la graisse piège le sable.
- Nettoyer le rail avec la pointe d'un couteau : raye l'anodisation.
- Peindre le rail pour le "rénover" : bloque le glissement.

## Quand appeler un professionnel

- Panneaux qui ne s'enclenchent plus dans la fermeture supérieure.
- Roulements qui grincent ou freinent.
- Rails avec rouille visible.
- Joints inférieurs détériorés.
- Besoin de démontage pour nettoyer l'intérieur de la feuillure.

## Pourquoi le sel les attaque-t-il davantage ?

La Costa Blanca a un air à forte teneur en sel. Ce sel cristallise dans les roulements et les grippe. Si les panneaux deviennent "durs", c'est le sel. Un nettoyage à l'eau tiède + vinaigre à 10 % dissout les cristaux sans affecter l'anodisation.

## Plan d'entretien annuel

- Janvier : révision des joints et roulements.
- Avril : nettoyage en profondeur avant la calima.
- Juillet : lubrification des roulements.
- Octobre : nettoyage des résidus de chantier et de la poussière estivale.`,
      },
      de: {
        title: "Glasschiebewände: Wie Sie Schienen und Glas wie neu erhalten",
        excerpt: "Rahmenlose Glasschiebewände liegen auf den Terrassen der Costa Blanca im Trend, aber ihre Schienen sind Schmutzfallen. Wir zeigen, wie Sie sie in 30 Minuten wie neu aussehen lassen.",
        dateLabel: "2. April 2026",
        body: `## Warum sie so schmutzig werden

Rahmenlose Glasschiebewände schließen Ihre Terrasse, ohne vertikale Profile zu benötigen, und Sie gewinnen 1 m² nutzbare Fläche und freien Blick. Doch das Schienensystem (die Führungen, auf denen die Paneele gleiten) sammelt:

- Schwebstaub.
- Baustellenreste.
- Strandsand.
- Salze aus der Meeresluft.
- Insekten.

Mit der Zeit verdichtet sich diese Mischung, und die Paneele lassen sich immer schlechter verschieben.

## Wie oft reinigen

- **Schienen:** alle 30-45 Tage.
- **Glas:** alle 14-21 Tage.
- **Tiefenreinigung:** alle 6 Monate.
- **Lagerkontrolle:** alle 12 Monate.

## Benötigtes Material

- Staubsauger mit schmaler Fugendüse.
- Harte Zahnbürste.
- Mikrofasertuch.
- Osmosewasser oder Leitungswasser mit Essig.
- Silikonspray-Schmiermittel (nicht fettend).
- Gummiabzieher.

## Methode in 5 Schritten

1. **Öffnen Sie die Paneele** und entfernen Sie die untere Gummidichtung der Schiene.
2. **Saugen** Sie das Innere der Schiene mit der schmalen Düse aus.
3. **Bürsten** Sie festsitzende Reste mit der Zahnbürste ab.
4. **Wischen** Sie den Boden mit einem feuchten Mikrofasertuch mit Wasser und Essig ab.
5. **Schmieren** Sie die Lager mit Silikonspray.

## Das Glas

Für die Paneele gilt die 3-Schritte-Regel:

- Osmosewasser aufsprühen.
- 1 Minute warten.
- Von oben nach unten abziehen, ohne nachzuziehen.

## Häufige Fehler

- Starke Seife verwenden: hinterlässt einen Film, der mehr Staub anzieht.
- Die Schienen fetten statt schmieren: Fett fängt Sand ein.
- Die Schiene mit einer Messerspitze reinigen: verkratzt die Eloxierung.
- Die Schiene zum "Auffrischen" streichen: blockiert das Gleiten.

## Wann Sie einen Fachmann rufen sollten

- Paneele, die nicht mehr in den oberen Verschluss passen.
- Lager, die quietschen oder klemmen.
- Schienen mit sichtbarem Rost.
- Verschlissene untere Dichtungen.
- Notwendige Demontage zur Innenreinigung des Falzes.

## Warum greift Salz sie besonders an?

Die Costa Blanca hat einen hohen Salzgehalt in der Luft. Dieses Salz kristallisiert in den Lagern und blockiert sie. Fühlen sich die Paneele "schwergängig" an, ist das Salz die Ursache. Eine Reinigung mit lauwarmem Wasser + 10 % Essig löst die Kristalle, ohne die Eloxierung zu beeinträchtigen.

## Jährlicher Wartungsplan

- Januar: Überprüfung von Dichtungen und Lagern.
- April: Tiefenreinigung vor der Calima-Saison.
- Juli: Schmierung der Lager.
- Oktober: Reinigung von Baustaub und Sommerschmutz.`,
      },
      ru: {
        title: "Раздвижные стеклянные системы: как сохранить направляющие и стекло как новые",
        excerpt: "Безрамные раздвижные стеклянные системы в моде на террасах Коста-Бланки, но их направляющие — настоящие ловушки для грязи. Рассказываем, как привести их в порядок за 30 минут.",
        dateLabel: "2 апреля 2026 г.",
        body: `## Почему они так сильно пачкаются

Безрамные раздвижные стеклянные системы закрывают вашу террасу без вертикальных стоек, добавляя 1 м² полезной площади и не загораживая вид. Но система направляющих (по которым скользят панели) собирает:

- Взвешенную пыль.
- Строительный мусор.
- Пляжный песок.
- Соли морского воздуха.
- Насекомых.

Со временем эта смесь уплотняется, и панели начинают плохо скользить.

## Как часто их чистить

- **Направляющие:** каждые 30-45 дней.
- **Стёкла:** каждые 14-21 день.
- **Глубокая чистка:** каждые 6 месяцев.
- **Проверка подшипников:** каждые 12 месяцев.

## Необходимые материалы

- Пылесос с узкой насадкой.
- Жёсткая зубная щётка.
- Микрофибра.
- Осмотическая вода или водопроводная вода с уксусом.
- Силиконовая смазка-спрей (нежирная).
- Резиновая стяжка.

## Метод в 5 шагов

1. **Откройте панели** и снимите нижний уплотнитель направляющей.
2. **Пропылесосьте** внутреннюю часть направляющей узкой насадкой.
3. **Прочистите щёткой** прилипшие остатки.
4. **Протрите** дно влажной микрофиброй с водой и уксусом.
5. **Смажьте** подшипники силиконовым спреем.

## Стекло

Для панелей действует правило 3 шагов:

- Разбрызгать осмотическую воду.
- Подождать 1 минуту.
- Провести стяжкой сверху вниз без повторов.

## Частые ошибки

- Использование сильного мыла: оставляет плёнку, притягивающую больше пыли.
- Смазывание направляющих густой смазкой вместо лёгкой: жир задерживает песок.
- Чистка направляющей кончиком ножа: царапает анодированное покрытие.
- Покраска направляющей для «обновления»: блокирует скольжение.

## Когда вызывать специалиста

- Панели не закрываются в верхнем замке.
- Подшипники скрипят или тормозят.
- Видимая ржавчина на направляющих.
- Изношенные нижние уплотнители.
- Необходимость демонтажа для внутренней чистки фальца.

## Почему соль воздействует на них сильнее?

На Коста-Бланке высокое содержание соли в воздухе. Эта соль кристаллизуется в подшипниках и заклинивает их. Если панели стали двигаться «туго» — это соль. Чистка тёплой водой с 10%-м уксусом растворяет кристаллы, не повреждая анодирование.

## Годовой план обслуживания

- Январь: проверка уплотнителей и подшипников.
- Апрель: глубокая чистка перед сезоном калимы.
- Июль: смазка подшипников.
- Октябрь: чистка от строительной пыли и летней грязи.`,
      },
    },
  },
  {
    slug: "limpieza-espejos-profesional",
    published: 1,
    categorySlug: "soluciones-hogar",
    tags: ["hogar", "mantenimiento", "espejos"],
    i18n: {
      en: {
        title: "Cleaning Mirrors: The Professional Trick for a Streak-Free Finish",
        excerpt: "Warm water, microfibre and one motion. Why commercial cleaners leave halos, and what to do to avoid them.",
        dateLabel: "April 9, 2026",
        body: `## Why mirrors get streaky

A mirror is a piece of glass with a silver or aluminium coating on the back. That metallic layer reacts to moisture and alkaline products. Clean it the wrong way and you leave micro-fractures in the coating, which then show up as "map-of-the-world" marks.

## The professional trick

It sounds simple: hot water, good-quality microfibre and a single stroke from corner to corner. Nothing else.

## What you need

- Warm water (not hot, not cold).
- Clean microfibre cloth (no fabric softener).
- Spray bottle.
- Optional: 70% isopropyl alcohol for greasy marks.

## Method in 3 steps

1. **Spray** warm water onto the surface.
2. **Wipe** with the microfibre in a single diagonal stroke, from top corner to bottom corner.
3. **Dry** with the dry side of the microfibre, also in a single stroke.

## What you should never use

- **Pure ammonia:** dulls the silver layer.
- **Commercial glass cleaner:** mostly contains ammonia.
- **Newspaper:** the fibres scratch the protective glass.
- **Undiluted vinegar:** attacks the mirror's edge sealant.
- **Kitchen cloth:** carries grease and soap residue.

## Specific stains

- **Fingerprints:** 70% isopropyl alcohol with microfibre.
- **Stuck hair:** one pass with painter's tape.
- **Toothpaste splashes:** baking soda paste, leave 30 seconds, remove.
- **Damp marks:** dry immediately and ventilate the area.
- **Map-of-the-world marks:** the mirror is damaged, it needs replacing.

## Why commercial cleaners leave halos

They contain ammonia and silicones. Silicones give instant shine, but as they evaporate, they leave a film that attracts dust. Your next clean will take twice as long.

## The wet-cloth mistake

Wiping with a damp cloth, wrung out "by eye", creates two problems:

- Too wet: streaks and drips.
- Too dry: friction and possible scratching.

The fix: use a spray bottle and control the amount.

## Large-format mirrors

For mirrors over 1 m², split the surface into 4 quadrants and clean each with a single stroke. The result is incomparable.

## How often

- Bathroom: every 7-10 days.
- Hallway: every 14 days.
- Bedroom: every 30 days.
- Gym or dressing room: every 7 days.`,
      },
      fr: {
        title: "Nettoyage des miroirs : l'astuce professionnelle pour ne laisser aucune trace",
        excerpt: "Eau tiède, microfibre et un seul geste. Pourquoi les nettoyants du commerce laissent des auréoles, et comment les éviter.",
        dateLabel: "9 avril 2026",
        body: `## Pourquoi les miroirs se tachent

Le miroir est une vitre dotée d'une couche d'argent ou d'aluminium à l'arrière. Cette couche métallique réagit à l'humidité et aux produits alcalins. Mal nettoyée, elle laisse des micro-fissures qui font apparaître ces fameuses "taches en forme de carte du monde".

## L'astuce du professionnel

Ça paraît simple : eau chaude, microfibre de bonne qualité et un seul geste d'un coin à l'autre. Rien de plus.

## Ce dont vous avez besoin

- Eau tiède (ni chaude, ni froide).
- Chiffon microfibre propre (sans assouplissant).
- Pulvérisateur.
- Optionnel : alcool isopropylique à 70 % pour les taches de graisse.

## Méthode en 3 étapes

1. **Vaporisez** de l'eau tiède sur la surface.
2. **Passez** la microfibre en un seul geste diagonal, du coin supérieur au coin inférieur.
3. **Séchez** avec la face sèche de la microfibre, également en un seul geste.

## Ce qu'il ne faut jamais utiliser

- **Ammoniaque pure :** ternit la couche d'argent.
- **Nettoyant vitres du commerce :** contient en général de l'ammoniaque.
- **Papier journal :** la fibre raye le verre protecteur.
- **Vinaigre non dilué :** attaque les joints du miroir.
- **Chiffon de cuisine :** contient des résidus de graisse et de savon.

## Taches spécifiques

- **Traces de doigts :** alcool isopropylique à 70 % avec microfibre.
- **Cheveux collés :** un seul passage de ruban adhésif de carrossier.
- **Éclaboussures de dentifrice :** pâte de bicarbonate, laisser 30 secondes, retirer.
- **Traces d'humidité :** sécher immédiatement et aérer la pièce.
- **Taches en carte du monde :** le miroir est abîmé, il faut le remplacer.

## Pourquoi les nettoyants vitres laissent des auréoles

Ils contiennent de l'ammoniaque et des silicones. Les silicones donnent un brillant immédiat, mais en s'évaporant, elles laissent un film qui attire la poussière. Le prochain nettoyage coûtera deux fois plus d'efforts.

## L'erreur du chiffon humide

Passer un chiffon humide, essoré "à vue de nez", crée deux problèmes :

- Trop mouillé : des coulures.
- Trop sec : frottement et risque de rayure.

La solution : utiliser un pulvérisateur et contrôler la quantité.

## Miroirs grand format

Pour les miroirs de plus de 1 m², divisez la surface en 4 quadrants et nettoyez chacun d'un seul geste. Le résultat n'a rien à voir.

## À quelle fréquence

- Salle de bain : tous les 7-10 jours.
- Entrée : tous les 14 jours.
- Chambre : tous les 30 jours.
- Salle de sport ou dressing : tous les 7 jours.`,
      },
      de: {
        title: "Spiegelreinigung: Der Profi-Trick für ein streifenfreies Ergebnis",
        excerpt: "Warmes Wasser, Mikrofaser und eine Bewegung. Warum handelsübliche Reiniger Schlieren hinterlassen und wie Sie das vermeiden.",
        dateLabel: "9. April 2026",
        body: `## Warum Spiegel Streifen bekommen

Ein Spiegel ist eine Glasscheibe mit einer Silber- oder Aluminiumschicht auf der Rückseite. Diese Metallschicht reagiert auf Feuchtigkeit und alkalische Produkte. Bei falscher Reinigung entstehen Mikrorisse in der Schicht, die dann als "Weltkarten-Flecken" sichtbar werden.

## Der Profi-Trick

Er klingt einfach: warmes Wasser, hochwertige Mikrofaser und eine einzige Bewegung von Ecke zu Ecke. Sonst nichts.

## Was Sie brauchen

- Warmes Wasser (nicht heiß, nicht kalt).
- Sauberes Mikrofasertuch (ohne Weichspüler).
- Sprühflasche.
- Optional: 70%iger Isopropylalkohol für Fettflecken.

## Methode in 3 Schritten

1. **Sprühen** Sie warmes Wasser auf die Oberfläche.
2. **Wischen** Sie mit der Mikrofaser in einem einzigen diagonalen Zug, von der oberen zur unteren Ecke.
3. **Trocknen** Sie mit der trockenen Seite der Mikrofaser, ebenfalls in einem Zug.

## Was Sie niemals verwenden sollten

- **Reines Ammoniak:** trübt die Silberschicht.
- **Handelsüblicher Glasreiniger:** enthält meist Ammoniak.
- **Zeitungspapier:** die Fasern verkratzen das Schutzglas.
- **Unverdünnter Essig:** greift die Randversiegelung des Spiegels an.
- **Küchentuch:** enthält Fett- und Seifenreste.

## Spezifische Flecken

- **Fingerabdrücke:** 70%iger Isopropylalkohol mit Mikrofaser.
- **Klebendes Haar:** einmaliges Abziehen mit Malerklebeband.
- **Zahnpastaspritzer:** Natronpaste, 30 Sekunden einwirken lassen, entfernen.
- **Feuchtigkeitsflecken:** sofort trocknen und den Bereich lüften.
- **Weltkarten-Flecken:** der Spiegel ist beschädigt und muss ersetzt werden.

## Warum handelsübliche Reiniger Schlieren hinterlassen

Sie enthalten Ammoniak und Silikone. Silikone sorgen für sofortigen Glanz, hinterlassen beim Verdunsten aber einen Film, der Staub anzieht. Die nächste Reinigung dauert doppelt so lange.

## Der Fehler mit dem feuchten Tuch

Ein "nach Gefühl" ausgewrungenes feuchtes Tuch zu benutzen, erzeugt zwei Probleme:

- Zu nass: Schlieren und Tropfen.
- Zu trocken: Reibung und mögliche Kratzer.

Die Lösung: eine Sprühflasche verwenden und die Menge kontrollieren.

## Großformatige Spiegel

Bei Spiegeln über 1 m² teilen Sie die Fläche in 4 Quadranten und reinigen jeden mit einem einzigen Zug. Das Ergebnis ist unvergleichlich.

## Wie oft

- Bad: alle 7-10 Tage.
- Flur: alle 14 Tage.
- Schlafzimmer: alle 30 Tage.
- Fitnessraum oder Ankleide: alle 7 Tage.`,
      },
      ru: {
        title: "Чистка зеркал: профессиональный приём без единого следа",
        excerpt: "Тёплая вода, микрофибра и одно движение. Почему бытовые средства оставляют разводы и как этого избежать.",
        dateLabel: "9 апреля 2026 г.",
        body: `## Почему зеркала покрываются разводами

Зеркало — это стекло с серебряным или алюминиевым покрытием на обратной стороне. Этот металлический слой реагирует на влагу и щелочные средства. При неправильной чистке на покрытии появляются микротрещины, которые проявляются как «пятна-материки».

## Профессиональный приём

Он кажется простым: тёплая вода, качественная микрофибра и одно движение из угла в угол. Больше ничего.

## Что понадобится

- Тёплая вода (не горячая и не холодная).
- Чистая микрофибра (без кондиционера для белья).
- Пульверизатор.
- По желанию: 70%-й изопропиловый спирт для жирных пятен.

## Метод в 3 шага

1. **Распылите** тёплую воду на поверхность.
2. **Проведите** микрофиброй одним диагональным движением от верхнего угла к нижнему.
3. **Высушите** сухой стороной микрофибры, также одним движением.

## Что нельзя использовать никогда

- **Чистый аммиак:** тускнит серебряное покрытие.
- **Бытовое средство для стёкол:** обычно содержит аммиак.
- **Газету:** волокна царапают защитное стекло.
- **Неразбавленный уксус:** разрушает герметик по краю зеркала.
- **Кухонное полотенце:** содержит остатки жира и мыла.

## Особые загрязнения

- **Отпечатки пальцев:** 70%-й изопропиловый спирт с микрофиброй.
- **Прилипшие волосы:** одно движение малярным скотчем.
- **Брызги зубной пасты:** паста из соды, оставить на 30 секунд, удалить.
- **Следы влаги:** немедленно высушить и проветрить помещение.
- **Пятна-материки:** зеркало повреждено, требуется замена.

## Почему бытовые средства оставляют разводы

Они содержат аммиак и силиконы. Силиконы дают мгновенный блеск, но при испарении оставляют плёнку, притягивающую пыль. Следующая чистка займёт вдвое больше времени.

## Ошибка с влажной тряпкой

Использование влажной тряпки, отжатой «на глаз», создаёт две проблемы:

- Слишком мокрая: потёки.
- Слишком сухая: трение и возможные царапины.

Решение: используйте пульверизатор и контролируйте количество.

## Зеркала большого формата

Для зеркал более 1 м² разделите поверхность на 4 квадранта и очищайте каждый одним движением. Результат несравним.

## Как часто

- Ванная: каждые 7-10 дней.
- Прихожая: каждые 14 дней.
- Спальня: каждые 30 дней.
- Спортзал или гардеробная: каждые 7 дней.`,
      },
    },
  },
  {
    slug: "caseros-vs-profesionales",
    published: 1,
    categorySlug: "soluciones-hogar",
    tags: ["hogar", "productos"],
    i18n: {
      en: {
        title: "Home Remedies vs. Professional Products: Is Vinegar Worth It? (Spoiler: Here's Why Not)",
        excerpt: "Vinegar, lemon, baking soda... do they actually work? We explain what they do to your glass and why a professional crew avoids them.",
        dateLabel: "April 16, 2026",
        body: `## The vinegar myth

Vinegar is 5-8% acetic acid. Yes, it dissolves limescale. But it also:

- Leaves an odour for hours.
- Attacks the rubber seals around the glass.
- Over time, dulls protective coatings.
- Is corrosive to nearby metals (aluminium, brass).

## Baking soda: an abrasive in paste form

Sodium bicarbonate is a mild abrasive. What they don't tell you:

- Its Mohs hardness is 2.5. Glass is 5.5.
- Used with rubbing, it leaves micro-scratches that are invisible at first.
- After 6 months, the glass looks "fuzzy".
- Scratching can't be polished out without professional equipment.

## Lemon: same family as vinegar

Citric acid. It works, but:

- It's photosensitive: leaves marks in direct light.
- Attacks anti-salt sealants.
- Its residue is hard to rinse off.

## Ammonia: the worst of all

Ammonia dissolves grease. But:

- Dulls mirror silvering within 6 months.
- Doesn't remove salts (sea salt build-up stays put).
- If rinsed badly, redistributes the grime.
- Is aggressive on seals and weatherstripping.

## Newspaper: the classic

Newspaper pulp carries:

- Ink (which transfers onto the glass).
- Short fibres (which scratch).
- Printing grease (which leaves marks).

It was useful when microfibre didn't exist. Today, it's counterproductive.

## What a professional uses

- **Reverse-osmosis water:** pure, no limescale, no residue.
- **Quality microfibre:** traps dirt instead of just moving it around.
- **Rubber squeegee:** removes it without rubbing.
- **10% citric acid** only for descaling stubborn sea-salt build-up.
- **Anti-salt sealants** specific to each type of glass.

## Why reverse-osmosis water makes the difference

Tap water carries 200-600 mg/l of salts. As it dries, those salts form a whitish layer. Reverse-osmosis water has less than 10 mg/l. The visible difference is immediate: no marks at all.

## When vinegar does work

- As a drain unblocker.
- For cleaning limescale off sanitary fittings (not glass).
- For descaling rubber seals (not the glass itself).
- NEVER directly on the glass.

## Your grandmother's rule

Your grandmother cleaned with vinegar because there was nothing else. Today, a basic kit of microfibre + reverse-osmosis water + squeegee costs under €20 and gives you better results for years.

## What about savings?

A bottle of vinegar costs €1. A professional clean with a water-fed pole and reverse-osmosis water costs €6-12 per window. The difference pays for itself through:

- Glass that lasts 5 years longer.
- No visible marks against the light.
- No risk of dulling from products.
- No need to re-polish every 2 years.`,
      },
      fr: {
        title: "Produits maison vs professionnels : le vinaigre en vaut-il la peine ? (Spoiler : voici pourquoi non)",
        excerpt: "Vinaigre, citron, bicarbonate... fonctionnent-ils vraiment ? On vous explique ce qu'ils font à votre vitre et pourquoi une équipe professionnelle les évite.",
        dateLabel: "16 avril 2026",
        body: `## Le mythe du vinaigre

Le vinaigre est de l'acide acétique à 5-8 %. Oui, il dissout le calcaire. Mais il :

- Laisse une odeur pendant des heures.
- Attaque les joints en caoutchouc de la vitre.
- Ternit avec le temps les couches protectrices.
- Est corrosif pour les métaux proches (aluminium, laiton).

## Le bicarbonate : un abrasif en pâte

Le bicarbonate de soude est un abrasif doux. Ce qu'on ne vous dit pas :

- Sa dureté Mohs est de 2,5. Celle du verre est de 5,5.
- Utilisé en frottant, il laisse des micro-rayures invisibles au début.
- Au bout de 6 mois, le verre a un aspect "flou".
- Ces rayures ne peuvent pas être polies sans matériel professionnel.

## Le citron : même famille que le vinaigre

Acide citrique. Ça fonctionne, mais :

- C'est photosensible : laisse des traces en cas de lumière directe.
- Attaque les scellants anti-sel.
- Son résidu est difficile à rincer.

## L'ammoniaque : le pire de tous

L'ammoniaque dissout la graisse. Mais :

- Ternit l'argenture des miroirs en 6 mois.
- N'élimine pas les sels (le salitre reste présent).
- Mal rincé, redistribue la saleté.
- Est agressif pour les joints et les garnitures.

## Le papier journal : le classique

La pâte de papier journal contient :

- De l'encre (qui se transfère sur le verre).
- Des fibres courtes (qui rayent).
- De la graisse d'impression (qui laisse des traces).

Utile quand la microfibre n'existait pas. Aujourd'hui, c'est contre-productif.

## Ce qu'utilise un professionnel

- **Eau osmosée :** pure, sans calcaire, sans résidu.
- **Microfibre de qualité :** piège la saleté au lieu de la déplacer.
- **Raclette en caoutchouc :** retire sans frotter.
- **Acide citrique à 10 %** uniquement pour désincruster du salitre bien précis.
- **Scellants anti-sel** spécifiques à chaque type de verre.

## Pourquoi l'eau osmosée fait toute la différence

L'eau du robinet contient 200-600 mg/l de sels. En séchant, ces sels forment une couche blanchâtre. L'eau osmosée en contient moins de 10 mg/l. La différence visible est immédiate : aucune trace.

## Quand le vinaigre fonctionne vraiment

- Comme déboucheur de canalisations.
- Pour nettoyer le calcaire sur les sanitaires (pas le verre).
- Pour désincruster les joints en caoutchouc (pas le verre).
- JAMAIS directement sur le verre.

## La règle de grand-mère

Votre grand-mère nettoyait au vinaigre parce qu'il n'y avait rien d'autre. Aujourd'hui, un kit de base microfibre + eau osmosée + raclette coûte moins de 20 € et donne de meilleurs résultats pendant des années.

## Et les économies ?

Le vinaigre coûte 1 € la bouteille. Un nettoyage professionnel à la perche avec eau osmosée coûte 6-12 € par fenêtre. La différence est rentabilisée par :

- Des vitres qui durent 5 ans de plus.
- Aucune trace visible à contre-jour.
- Aucun risque de ternissement par les produits.
- Aucun besoin de repolir tous les 2 ans.`,
      },
      de: {
        title: "Hausmittel vs. Profiprodukte: Lohnt sich Essig? (Spoiler: Wir erklären, warum nicht)",
        excerpt: "Essig, Zitrone, Natron ... funktionieren sie wirklich? Wir erklären, was sie mit Ihrem Glas machen und warum ein Profi-Team sie meidet.",
        dateLabel: "16. April 2026",
        body: `## Der Essig-Mythos

Essig ist 5-8%ige Essigsäure. Ja, er löst Kalk. Aber er:

- Hinterlässt stundenlang einen Geruch.
- Greift die Gummidichtungen der Scheibe an.
- Trübt mit der Zeit Schutzschichten.
- Ist korrosiv für nahegelegene Metalle (Aluminium, Messing).

## Natron: ein Schleifmittel in Pastenform

Natriumbicarbonat ist ein mildes Schleifmittel. Was man Ihnen nicht sagt:

- Seine Mohshärte beträgt 2,5. Die von Glas 5,5.
- Bei Anwendung mit Reiben hinterlässt es anfangs unsichtbare Mikrokratzer.
- Nach 6 Monaten wirkt das Glas "milchig".
- Diese Kratzer lassen sich ohne Profigerät nicht polieren.

## Zitrone: gleiche Familie wie Essig

Zitronensäure. Sie wirkt, aber:

- Ist lichtempfindlich: hinterlässt Flecken bei direktem Licht.
- Greift Anti-Salz-Versiegelungen an.
- Ihre Rückstände sind schwer auszuspülen.

## Ammoniak: das Schlimmste von allen

Ammoniak löst Fett. Aber:

- Trübt die Silberschicht von Spiegeln innerhalb von 6 Monaten.
- Entfernt keine Salze (Salzablagerung bleibt bestehen).
- Bei schlechtem Nachspülen verteilt es den Schmutz neu.
- Ist aggressiv gegenüber Dichtungen und Gummis.

## Zeitungspapier: der Klassiker

Zeitungspapierbrei enthält:

- Tinte (die sich auf das Glas überträgt).
- Kurze Fasern (die verkratzen).
- Druckfett (das Flecken hinterlässt).

Es war nützlich, als es noch keine Mikrofaser gab. Heute ist es kontraproduktiv.

## Was ein Profi verwendet

- **Osmosewasser:** rein, kalkfrei, rückstandslos.
- **Hochwertige Mikrofaser:** fängt Schmutz ein, statt ihn nur zu verschieben.
- **Gummiabzieher:** entfernt ohne Reiben.
- **10%ige Zitronensäure** nur zum Entkalken sehr spezifischer Salzablagerungen.
- **Anti-Salz-Versiegelungen** spezifisch für jede Glasart.

## Warum Osmosewasser den Unterschied macht

Leitungswasser enthält 200-600 mg/l Salze. Beim Trocknen bilden diese Salze eine weißliche Schicht. Osmosewasser enthält weniger als 10 mg/l. Der sichtbare Unterschied ist sofort da: keine Flecken.

## Wann Essig tatsächlich funktioniert

- Als Abflussreiniger.
- Zum Entfernen von Kalk an Sanitäranlagen (nicht am Glas).
- Zum Entkalken von Gummidichtungen (nicht des Glases selbst).
- NIEMALS direkt auf dem Glas.

## Omas Regel

Ihre Großmutter putzte mit Essig, weil es nichts anderes gab. Heute kostet ein Basis-Set aus Mikrofaser + Osmosewasser + Abzieher unter 20 € und liefert über Jahre bessere Ergebnisse.

## Und die Ersparnis?

Eine Flasche Essig kostet 1 €. Eine professionelle Reinigung mit Teleskopstange und Osmosewasser kostet 6-12 € pro Fenster. Der Unterschied amortisiert sich durch:

- Glas, das 5 Jahre länger hält.
- Keine sichtbaren Flecken im Gegenlicht.
- Kein Risiko der Trübung durch Produkte.
- Kein Bedarf, alle 2 Jahre nachzupolieren.`,
      },
      ru: {
        title: "Домашние средства против профессиональных: стоит ли использовать уксус? (Спойлер: рассказываем, почему нет)",
        excerpt: "Уксус, лимон, сода... действительно ли они работают? Рассказываем, что они делают со стеклом и почему профессиональная бригада их избегает.",
        dateLabel: "16 апреля 2026 г.",
        body: `## Миф об уксусе

Уксус — это 5-8%-я уксусная кислота. Да, он растворяет известковый налёт. Но также:

- Оставляет запах на несколько часов.
- Разъедает резиновые уплотнители стекла.
- Со временем тускнеют защитные покрытия.
- Коррозиен для расположенных рядом металлов (алюминий, латунь).

## Сода: абразив в виде пасты

Пищевая сода — мягкий абразив. Чего вам не говорят:

- Её твёрдость по шкале Мооса — 2,5. У стекла — 5,5.
- При использовании с трением она сначала оставляет невидимые микроцарапины.
- Через 6 месяцев стекло выглядит «мутным».
- Такие царапины нельзя отполировать без профессионального оборудования.

## Лимон: та же группа, что и уксус

Лимонная кислота. Работает, но:

- Фоточувствительна: оставляет пятна при прямом свете.
- Разъедает защиту от соли.
- Её остатки трудно смыть.

## Аммиак: худший из всех

Аммиак растворяет жир. Но:

- Тускнит серебряное покрытие зеркал за 6 месяцев.
- Не удаляет соли (солевой налёт остаётся).
- При плохом ополаскивании перераспределяет грязь.
- Агрессивен к уплотнителям.

## Газета: классика

Газетная масса содержит:

- Чернила (которые переходят на стекло).
- Короткие волокна (которые царапают).
- Типографский жир (который оставляет пятна).

Это было полезно, когда не существовало микрофибры. Сегодня это контрпродуктивно.

## Что использует профессионал

- **Осмотическую воду:** чистую, без извести, без остатков.
- **Качественную микрофибру:** улавливает грязь, а не просто перемещает её.
- **Резиновую стяжку:** удаляет без трения.
- **10%-ю лимонную кислоту** только для удаления конкретного стойкого солевого налёта.
- **Защиту от соли**, подобранную под конкретный тип стекла.

## Почему осмотическая вода имеет значение

Водопроводная вода содержит 200-600 мг/л солей. При высыхании эти соли образуют беловатый слой. В осмотической воде — менее 10 мг/л. Видимая разница заметна сразу: никаких следов.

## Когда уксус действительно работает

- Как средство для прочистки труб.
- Для удаления известкового налёта с сантехники (не со стекла).
- Для очистки резиновых уплотнителей (не самого стекла).
- НИКОГДА напрямую на стекле.

## Бабушкино правило

Ваша бабушка мыла уксусом, потому что ничего другого не было. Сегодня базовый набор из микрофибры, осмотической воды и стяжки стоит менее 20 € и даёт лучшие результаты на годы вперёд.

## А как насчёт экономии?

Бутылка уксуса стоит 1 €. Профессиональная мойка штангой с осмотической водой стоит 6-12 € за окно. Разница окупается за счёт:

- Стёкол, служащих на 5 лет дольше.
- Отсутствия видимых следов на просвет.
- Отсутствия риска помутнения от средств.
- Отсутствия необходимости повторной полировки каждые 2 года.`,
      },
    },
  },
  {
    slug: "tecnicas-rappel-benidorm",
    published: 0,
    categorySlug: "seguridad-tecnica",
    tags: ["altura", "rappel", "seguridad", "costa-blanca"],
    i18n: {
      en: {
        title: "Rope Access Techniques: How We Work Suspended on Benidorm's Skyscrapers",
        excerpt: "Double rope, prusik knots, lifelines, and a protocol no professional skips. We open the hood on high-rise cleaning.",
        dateLabel: "March 12, 2026",
        body: `## Why Benidorm needs specialists

Benidorm has the highest concentration of skyscrapers per square metre in Spain. 30-storey buildings, full glass façades, cantilevered terraces. The city is a technical challenge for cleaning at height.

## The technique: double rope

We work with a double-rope system certified under EN 12841:

- **Working rope:** bears the operator's weight (static load).
- **Safety rope:** redundant, fitted with a fall-arrest device.
- Each rope has its own anchor point and its own inspection point.

If one fails, the other holds the operator. That's why it's doubled.

## The knots

- **Prusik knot:** self-locking on the safety rope.
- **Figure-eight knot:** connection to the harness.
- **Clove hitch:** auxiliary anchor.
- **Tape knot:** anchoring to the structure.

Every knot is checked by two people before work begins.

## The harness

Not all harnesses are suitable. For vertical work on a façade:

- Full-body harness (not just a waist belt).
- Sternal anchor point.
- Dorsal anchor point.
- Lateral positioning rings.
- EN 361 and EN 813 certification.

## Personal protective equipment

- Helmet with chin strap.
- Safety goggles.
- Cut-resistant gloves.
- Boots with non-slip soles.
- Breathable technical clothing.
- Fall-arrest device with energy absorber.

## The ascent protocol

1. **Visual inspection** of the façade and anchor points.
2. **Setting up the upper lifeline.**
3. **Knot verification** by a health-and-safety technician.
4. **Weather check:** wind, rain, lightning.
5. **Safety briefing** with the ground team.
6. **Controlled ascent:** maximum 0.5 m/s.
7. **Positioning and work.**
8. **Orderly descent:** never facing away from the façade.

## Suspension conditions

- Maximum sustained wind: 40 km/h.
- Rain: work suspended.
- Electrical activity: work suspended.
- Visibility below 100 m: work suspended.
- Outdoor temperature < 0°C or > 35°C: work suspended.
- Night work: only with express authorisation.

## Planning by façade

Every building is unique. Before going up:

- Work plan signed by a competent technician.
- Study of the structure and anchor points.
- Defined rescue point.
- Preventive resources on site.
- Coordination with the owner or community.

## The rescue

If an operator is left suspended unconscious, we have a protocol:

- Maximum safe suspension time: 10 minutes.
- Rescue team on the ground ready to go up.
- Independent rescue line.
- Constant communication by radio.
- If rescue takes longer than 10 minutes, emergency services are called.

That's why response time is critical.

## Training

Limpiezas Luz de Luna operators have:

- 60-hour initial course.
- 20-hour annual refresher.
- First-aid certification.
- Vertical rescue training.
- Annual medical check-up.

## Why not use cranes or scaffolding?

- **Cranes:** €1,500-3,000 per day.
- **Scaffolding:** €8-15 per m²/day, 3-5 days to assemble.
- **Rope access:** €3-8 per m², zero assembly time.

For specific buildings, rope access is 4-8 times cheaper and much faster.

## What people don't see

Cleaning windows at 80 metres isn't "just hanging there". It's a technical operation with:

- Written safety protocols.
- Certified equipment inspected every 6 months.
- €1.2M public liability insurance.
- 15 years of experience on the Costa Blanca.

## At Limpiezas Luz de Luna

We work on the tallest buildings in Benidorm, Calpe and Altea. If you need window cleaning at height, we provide you in writing with:

- Work plan.
- Operator certifications.
- Insurance policies.
- A closed quote with no surprises.`,
      },
      fr: {
        title: "Techniques de rappel : comment nous travaillons suspendus sur les gratte-ciel de Benidorm",
        excerpt: "Double corde, nœuds prusik, lignes de vie et un protocole qu'aucun professionnel ne néglige. On vous ouvre les coulisses du nettoyage en hauteur.",
        dateLabel: "12 mars 2026",
        body: `## Pourquoi Benidorm a besoin de spécialistes

Benidorm a la plus forte concentration de gratte-ciel au mètre carré d'Espagne. Des immeubles de 30 étages, des façades entièrement vitrées, des terrasses en porte-à-faux. La ville est un défi technique pour le nettoyage en hauteur.

## La technique : la double corde

Nous travaillons avec un système à double corde homologué selon la norme EN 12841 :

- **Corde de travail :** supporte le poids de l'opérateur (charge statique).
- **Corde de sécurité :** redondante, munie d'un antichute.
- Chaque corde a son propre ancrage et son propre point de contrôle.

Si l'une cède, l'autre retient l'opérateur. D'où le doublement.

## Les nœuds

- **Nœud prusik :** autobloquant sur la corde de sécurité.
- **Nœud en huit :** connexion au harnais.
- **Nœud de cabestan :** ancrage auxiliaire.
- **Nœud de sangle :** ancrage à la structure.

Chaque nœud est vérifié par deux personnes avant le début du travail.

## Le harnais

Tous les harnais ne conviennent pas. Pour les travaux verticaux en façade :

- Harnais intégral (pas seulement ceinture).
- Point d'ancrage sternal.
- Point d'ancrage dorsal.
- Anneaux de positionnement latéraux.
- Certification EN 361 et EN 813.

## L'équipement de protection individuelle

- Casque avec jugulaire.
- Lunettes de protection.
- Gants anti-coupure.
- Chaussures à semelle antidérapante.
- Vêtements techniques respirants.
- Antichute avec absorbeur d'énergie.

## Le protocole de montée

1. **Inspection visuelle** de la façade et des points d'ancrage.
2. **Mise en place de la ligne de vie** supérieure.
3. **Vérification des nœuds** par un technicien PRL.
4. **Contrôle météo :** vent, pluie, orages.
5. **Briefing sécurité** avec l'équipe au sol.
6. **Montée contrôlée :** 0,5 m/s maximum.
7. **Positionnement et travail.**
8. **Descente ordonnée :** jamais dos à la façade.

## Conditions de suspension du travail

- Vent maximal soutenu : 40 km/h.
- Pluie : suspension.
- Activité orageuse : suspension.
- Visibilité inférieure à 100 m : suspension.
- Température extérieure < 0 °C ou > 35 °C : suspension.
- Travail de nuit : uniquement avec autorisation expresse.

## La planification par façade

Chaque bâtiment est unique. Avant de monter :

- Plan de travail signé par un technicien compétent.
- Étude de la structure et des ancrages.
- Point de secours défini.
- Ressources de prévention sur place.
- Coordination avec la propriété ou la copropriété.

## Le sauvetage

Si un opérateur reste suspendu inconscient, nous avons un protocole :

- Temps de suspension sûr maximal : 10 minutes.
- Équipe de secours au sol prête à monter.
- Ligne de sauvetage indépendante.
- Communication constante par radio.
- Si le sauvetage dépasse 10 minutes, appel aux secours d'urgence.

D'où l'importance critique du temps de réponse.

## La formation

Les opérateurs de Limpiezas Luz de Luna disposent de :

- Formation initiale de 60 heures.
- Recyclage annuel de 20 heures.
- Certificat de premiers secours.
- Formation au sauvetage vertical.
- Bilan médical annuel.

## Pourquoi ne pas utiliser de grues ni d'échafaudages ?

- **Grues :** 1 500-3 000 € par jour.
- **Échafaudages :** 8-15 € par m²/jour, montage de 3-5 jours.
- **Travail vertical :** 3-8 € par m², montage nul.

Pour des bâtiments ponctuels, le travail vertical est 4 à 8 fois moins cher et bien plus rapide.

## Ce que les gens ne voient pas

Nettoyer des vitres à 80 m, ce n'est pas "se suspendre et c'est tout". C'est une opération technique avec :

- Des protocoles de sécurité écrits.
- Des équipements certifiés révisés tous les 6 mois.
- Une assurance RC de 1,2 M €.
- 15 ans d'expérience sur la Costa Blanca.

## Chez Limpiezas Luz de Luna

Nous travaillons sur les immeubles les plus hauts de Benidorm, Calpe et Altea. Si vous avez besoin d'un nettoyage de vitres en hauteur, nous vous remettons par écrit :

- Le plan de travail.
- Les certifications des opérateurs.
- Les polices d'assurance.
- Un devis fermé, sans surprise.`,
      },
      de: {
        title: "Abseiltechniken: Wie wir schwebend an Benidorms Wolkenkratzern arbeiten",
        excerpt: "Doppelseil, Prusikknoten, Sicherungsleinen und ein Protokoll, das kein Profi überspringt. Wir öffnen die Motorhaube der Höhenreinigung.",
        dateLabel: "12. März 2026",
        body: `## Warum Benidorm Spezialisten braucht

Benidorm hat die höchste Wolkenkratzerdichte pro Quadratmeter in Spanien. Gebäude mit 30 Stockwerken, komplett verglaste Fassaden, auskragende Terrassen. Die Stadt ist eine technische Herausforderung für die Höhenreinigung.

## Die Technik: Doppelseil

Wir arbeiten mit einem nach EN 12841 zertifizierten Doppelseilsystem:

- **Arbeitsseil:** trägt das Gewicht des Mitarbeiters (statische Last).
- **Sicherungsseil:** redundant, mit Auffangvorrichtung.
- Jedes Seil hat seinen eigenen Anker- und Kontrollpunkt.

Versagt eines, hält das andere den Mitarbeiter. Deshalb doppelt.

## Die Knoten

- **Prusikknoten:** selbstblockierend am Sicherungsseil.
- **Achterknoten:** Verbindung zum Gurt.
- **Mastwurf:** Hilfsverankerung.
- **Bandschlingenknoten:** Verankerung an der Struktur.

Jeder Knoten wird vor Arbeitsbeginn von zwei Personen geprüft.

## Der Gurt

Nicht jeder Gurt eignet sich. Für vertikale Arbeiten an der Fassade:

- Ganzkörpergurt (nicht nur Hüftgurt).
- Sternaler Anschlagpunkt.
- Dorsaler Anschlagpunkt.
- Seitliche Positionierungsringe.
- Zertifizierung nach EN 361 und EN 813.

## Persönliche Schutzausrüstung

- Helm mit Kinnriemen.
- Schutzbrille.
- Schnittfeste Handschuhe.
- Stiefel mit rutschfester Sohle.
- Atmungsaktive Funktionskleidung.
- Auffangvorrichtung mit Falldämpfer.

## Das Aufstiegsprotokoll

1. **Sichtprüfung** der Fassade und der Verankerungspunkte.
2. **Anbringen der oberen Sicherungsleine.**
3. **Knotenprüfung** durch eine Fachkraft für Arbeitssicherheit.
4. **Wetterprüfung:** Wind, Regen, Blitze.
5. **Sicherheitsbriefing** mit dem Bodenteam.
6. **Kontrollierter Aufstieg:** maximal 0,5 m/s.
7. **Positionierung und Arbeit.**
8. **Geordneter Abstieg:** nie mit dem Rücken zur Fassade.

## Abbruchbedingungen

- Maximaler anhaltender Wind: 40 km/h.
- Regen: Arbeit wird eingestellt.
- Gewitteraktivität: Arbeit wird eingestellt.
- Sicht unter 100 m: Arbeit wird eingestellt.
- Außentemperatur < 0 °C oder > 35 °C: Arbeit wird eingestellt.
- Nachtarbeit: nur mit ausdrücklicher Genehmigung.

## Die Planung je Fassade

Jedes Gebäude ist einzigartig. Vor dem Aufstieg:

- Arbeitsplan, unterzeichnet von einem qualifizierten Techniker.
- Untersuchung der Struktur und der Verankerungen.
- Festgelegter Rettungspunkt.
- Präventive Ressourcen vor Ort.
- Abstimmung mit Eigentümer oder Gemeinschaft.

## Die Rettung

Bleibt ein Mitarbeiter bewusstlos hängen, gibt es ein Protokoll:

- Maximale sichere Hängezeit: 10 Minuten.
- Rettungsteam am Boden bereit zum Aufstieg.
- Unabhängige Rettungsleine.
- Ständige Funkkommunikation.
- Dauert die Rettung länger als 10 Minuten, wird der Notdienst gerufen.

Deshalb ist die Reaktionszeit entscheidend.

## Die Ausbildung

Die Mitarbeiter von Limpiezas Luz de Luna haben:

- 60-stündigen Grundkurs.
- 20-stündige jährliche Auffrischung.
- Erste-Hilfe-Zertifikat.
- Training in Höhenrettung.
- Jährliche ärztliche Untersuchung.

## Warum keine Kräne oder Gerüste?

- **Kräne:** 1.500-3.000 € pro Tag.
- **Gerüste:** 8-15 € pro m²/Tag, 3-5 Tage Montagezeit.
- **Seilzugangstechnik:** 3-8 € pro m², keine Montagezeit.

Bei einzelnen Gebäuden ist die Seilzugangstechnik 4- bis 8-mal günstiger und viel schneller.

## Was man nicht sieht

Fenster in 80 m Höhe zu reinigen bedeutet nicht "einfach abhängen". Es ist ein technischer Vorgang mit:

- Schriftlichen Sicherheitsprotokollen.
- Zertifizierter Ausrüstung, die alle 6 Monate geprüft wird.
- Haftpflichtversicherung über 1,2 Mio. €.
- 15 Jahren Erfahrung an der Costa Blanca.

## Bei Limpiezas Luz de Luna

Wir arbeiten an den höchsten Gebäuden in Benidorm, Calpe und Altea. Wenn Sie Fensterreinigung in der Höhe benötigen, erhalten Sie von uns schriftlich:

- Arbeitsplan.
- Zertifikate der Mitarbeiter.
- Versicherungspolicen.
- Ein festes Angebot ohne Überraschungen.`,
      },
      ru: {
        title: "Техники верёвочного доступа: как мы работаем, подвешенные на небоскрёбах Бенидорма",
        excerpt: "Двойная верёвка, узлы прусика, страховочные линии и протокол, который не пропускает ни один профессионал. Приоткрываем завесу над мойкой окон на высоте.",
        dateLabel: "12 марта 2026 г.",
        body: `## Почему Бенидорму нужны специалисты

В Бенидорме самая высокая концентрация небоскрёбов на квадратный метр в Испании. 30-этажные здания, полностью стеклянные фасады, консольные террасы. Город представляет собой техническую задачу для мойки на высоте.

## Техника: двойная верёвка

Мы работаем по системе двойной верёвки, сертифицированной по стандарту EN 12841:

- **Рабочая верёвка:** несёт вес работника (статическая нагрузка).
- **Страховочная верёвка:** резервная, с устройством защиты от падения.
- У каждой верёвки своя точка крепления и своя точка проверки.

Если одна выйдет из строя, другая удержит работника. Поэтому она двойная.

## Узлы

- **Узел прусика:** самозатягивающийся на страховочной верёвке.
- **Восьмёрка:** соединение со страховочной привязью.
- **Штык:** вспомогательное крепление.
- **Ленточный узел:** крепление к конструкции.

Каждый узел проверяется двумя людьми перед началом работы.

## Страховочная привязь

Подходит не любая привязь. Для вертикальных работ на фасаде:

- Полная страховочная привязь (не только поясная).
- Грудная точка крепления.
- Спинная точка крепления.
- Боковые кольца для позиционирования.
- Сертификация по EN 361 и EN 813.

## Средства индивидуальной защиты

- Каска с подбородочным ремнём.
- Защитные очки.
- Перчатки, защищающие от порезов.
- Ботинки с нескользящей подошвой.
- Дышащая техническая одежда.
- Устройство защиты от падения с амортизатором энергии.

## Протокол подъёма

1. **Визуальный осмотр** фасада и точек крепления.
2. **Установка** верхней страховочной линии.
3. **Проверка узлов** специалистом по охране труда.
4. **Проверка погоды:** ветер, дождь, молнии.
5. **Инструктаж по безопасности** с наземной командой.
6. **Контролируемый подъём:** максимум 0,5 м/с.
7. **Позиционирование и работа.**
8. **Упорядоченный спуск:** никогда спиной к фасаду.

## Условия приостановки работ

- Максимальный устойчивый ветер: 40 км/ч.
- Дождь: работа приостанавливается.
- Грозовая активность: работа приостанавливается.
- Видимость менее 100 м: работа приостанавливается.
- Температура воздуха < 0 °C или > 35 °C: работа приостанавливается.
- Ночная работа: только с прямого разрешения.

## Планирование по фасадам

Каждое здание уникально. Перед подъёмом:

- План работ, подписанный компетентным специалистом.
- Изучение конструкции и точек крепления.
- Определённая точка спасения.
- Профилактические ресурсы на объекте.
- Согласование с владельцем или ТСЖ.

## Спасение

Если работник останется подвешенным без сознания, у нас есть протокол:

- Максимальное безопасное время подвешивания: 10 минут.
- Спасательная команда на земле готова к подъёму.
- Независимая спасательная линия.
- Постоянная связь по рации.
- Если спасение занимает более 10 минут, вызываются экстренные службы.

Поэтому время реакции критично.

## Обучение

Работники Limpiezas Luz de Luna имеют:

- 60-часовой базовый курс.
- Ежегодное 20-часовое повышение квалификации.
- Сертификат по оказанию первой помощи.
- Обучение вертикальному спасению.
- Ежегодный медицинский осмотр.

## Почему не использовать краны или леса?

- **Краны:** 1500-3000 € в день.
- **Леса:** 8-15 € за м²/день, монтаж 3-5 дней.
- **Верёвочный доступ:** 3-8 € за м², монтаж не требуется.

Для отдельных зданий верёвочный доступ в 4-8 раз дешевле и намного быстрее.

## Чего не видят люди

Мыть окна на высоте 80 м — это не «просто повиснуть». Это техническая операция с:

- Письменными протоколами безопасности.
- Сертифицированным оборудованием, проверяемым каждые 6 месяцев.
- Страхованием ответственности на 1,2 млн €.
- 15-летним опытом работы на Коста-Бланке.

## В Limpiezas Luz de Luna

Мы работаем на самых высоких зданиях Бенидорма, Кальпе и Альтеа. Если вам нужна мойка окон на высоте, мы предоставим вам письменно:

- План работ.
- Сертификаты работников.
- Страховые полисы.
- Фиксированную смету без сюрпризов.`,
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Preflight: comprueba que el esquema ya tiene soporte de idiomas antes de
// insertar nada. La migración en sí (columna locale + índice compuesto) es
// responsabilidad de ensureSchema() en lib/db.js, no de este script.
// ---------------------------------------------------------------------------
async function preflight() {
  const cols = await db.execute(`PRAGMA table_info(posts)`);
  const hasLocale = cols.rows.some((r) => r.name === "locale");
  if (!hasLocale) {
    console.error(
      "La tabla 'posts' todavía no tiene la columna 'locale'. Este script depende de la migración " +
      "multi-idioma de ensureSchema() (lib/db.js), que añade esa columna a categories/tags/posts. " +
      "Ejecuta primero cualquier función o script que llame a ensureSchema() (p. ej. node scripts/init-db.js) " +
      "y vuelve a intentarlo."
    );
    process.exit(1);
  }
}

async function getCategoryId(slug, locale) {
  if (!slug) return null;
  const r = await db.execute({
    sql: `SELECT id FROM categories WHERE slug = ? AND locale = ? LIMIT 1`,
    args: [slug, locale],
  });
  return r.rows[0]?.id || null;
}

async function getTagId(slug, locale) {
  const r = await db.execute({
    sql: `SELECT id FROM tags WHERE slug = ? AND locale = ? LIMIT 1`,
    args: [slug, locale],
  });
  return r.rows[0]?.id || null;
}

// La imagen destacada no se traduce: se reutiliza tal cual la del post
// original en español (misma slug, locale = 'es'). No se guarda en este
// archivo (algunas pesan >1MB en base64); se copia en el momento del INSERT.
async function getSpanishImageDataUrl(slug) {
  const r = await db.execute({
    sql: `SELECT image_data_url FROM posts WHERE slug = ? AND locale = 'es' LIMIT 1`,
    args: [slug],
  });
  return r.rows[0]?.image_data_url || null;
}

(async () => {
  try {
    await ensureSchema();
    await preflight();

    const stats = {
      categories: { inserted: 0, skipped: 0 },
      tags: { inserted: 0, skipped: 0 },
      posts: { inserted: 0, skipped: 0 },
      postTags: { inserted: 0 },
    };

    for (const locale of LOCALES) {
      // --- Categorías traducidas ---
      for (const c of CATEGORIES) {
        const t = c.i18n[locale];
        const existing = await db.execute({
          sql: `SELECT id FROM categories WHERE slug = ? AND locale = ? LIMIT 1`,
          args: [c.slug, locale],
        });
        if (existing.rows.length) { stats.categories.skipped++; continue; }
        await db.execute({
          sql: `INSERT INTO categories (id, slug, name, description, sort_order, locale) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [id(), c.slug, t.name, t.description, c.sortOrder, locale],
        });
        stats.categories.inserted++;
      }

      // --- Tags traducidos ---
      for (const t of TAGS) {
        const name = t.i18n[locale];
        const existing = await db.execute({
          sql: `SELECT id FROM tags WHERE slug = ? AND locale = ? LIMIT 1`,
          args: [t.slug, locale],
        });
        if (existing.rows.length) { stats.tags.skipped++; continue; }
        await db.execute({
          sql: `INSERT INTO tags (id, slug, name, locale) VALUES (?, ?, ?, ?)`,
          args: [id(), t.slug, name, locale],
        });
        stats.tags.inserted++;
      }

      // --- Posts traducidos (misma slug que el original en español) ---
      for (const p of POSTS) {
        const tr = p.i18n[locale];
        const existingPost = await db.execute({
          sql: `SELECT id FROM posts WHERE slug = ? AND locale = ? LIMIT 1`,
          args: [p.slug, locale],
        });
        if (existingPost.rows.length) { stats.posts.skipped++; continue; }

        const categoryId = await getCategoryId(p.categorySlug, locale);
        const imageDataUrl = await getSpanishImageDataUrl(p.slug);
        const postId = id();
        await db.execute({
          sql: `INSERT INTO posts (id, slug, title, excerpt, body, date_label, image_data_url, published, category_id, locale)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [postId, p.slug, tr.title, tr.excerpt, tr.body, tr.dateLabel, imageDataUrl, p.published, categoryId, locale],
        });
        stats.posts.inserted++;

        for (const tagSlug of p.tags) {
          const tagId = await getTagId(tagSlug, locale);
          if (!tagId) continue;
          await db.execute({
            sql: `INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)`,
            args: [postId, tagId],
          });
          stats.postTags.inserted++;
        }
      }

      console.log(`✓ Idioma '${locale}' procesado.`);
    }

    console.log("");
    console.log("=== Resumen ===");
    console.log(`Categorías: ${stats.categories.inserted} insertadas, ${stats.categories.skipped} ya existían.`);
    console.log(`Tags:       ${stats.tags.inserted} insertados, ${stats.tags.skipped} ya existían.`);
    console.log(`Posts:      ${stats.posts.inserted} insertados, ${stats.posts.skipped} ya existían.`);
    console.log(`post_tags:  ${stats.postTags.inserted} relaciones insertadas.`);
    console.log("✓ Listo.");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
