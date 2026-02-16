import { db } from "../server/db";
import { sql } from "drizzle-orm";

const COMMON_FIRST_NAMES = new Set([
  "aaron","abby","abigail","adam","adele","adrian","adriana","adrienne","agnes","aiden","aimee","al","alan","albert","alec","alejandra","alejandro","alex","alexa","alexander","alexandra","alexis","ali","alice","alicia","alina","alison","allison","allen","allie","alyssa","amanda","amber","amelia","amy","ana","anastasia","andrea","andrew","andy","angel","angela","angie","anita","ann","anna","anne","annette","annie","anthony","antonio","april","ariana","ariel","arlene","arthur","ashley","audrey","austin","autumn","ava","avery","barb","barbara","barry","beatrice","becky","bella","ben","benjamin","bernadette","beth","bethany","betsy","betty","beverly","bill","billy","blake","bob","bobby","bonnie","brad","braden","bradley","brandon","brenda","brendan","brent","brett","brian","brianna","bridget","brittany","brooke","bruce","bryan","bryce","caitlin","caleb","cameron","camille","candace","cara","carey","carl","carla","carlos","carmen","carol","carolina","caroline","carolyn","carrie","carter","casey","cassandra","cassidy","catherine","cathy","cecilia","chad","charles","charlie","charlotte","chase","chelsea","cheryl","chris","christian","christina","christine","christopher","christy","chuck","cindy","claire","clara","clarence","clark","claudia","clay","cliff","clifford","clint","cole","colette","colin","colleen","connor","connie","corey","courtney","craig","cristina","crystal","curt","curtis","cynthia","daisy","dale","dan","dana","daniel","daniela","daniella","danielle","danny","daphne","darcy","darlene","darren","dave","david","dawn","dean","debbie","deborah","debra","dee","deidre","denis","denise","dennis","derek","devon","diana","diane","dianne","dick","diego","dina","dolores","dominic","dominique","don","donna","doreen","doris","dorothy","doug","douglas","drew","duane","dustin","dylan","earl","ed","eddie","edith","edward","eileen","elaine","eleanor","elena","eli","eliana","elijah","elisa","elise","elizabeth","ella","ellen","ellie","elliot","emily","emma","emmett","eric","erica","erik","erika","erin","ernest","esther","ethan","eugene","eva","evan","eve","evelyn","faith","faye","felicia","fern","fiona","florence","fran","frances","francesca","frank","fred","frederick","gabe","gabriel","gabriela","gabriella","gabrielle","gail","garrett","gary","gavin","gene","genevieve","george","gerald","gina","ginger","glen","glenn","gloria","grace","gracie","grant","greg","gregory","gretchen","hailey","haley","hannah","harold","harriet","harry","heather","heidi","helen","henry","herbert","hillary","holly","hope","howard","hunter","ian","ilene","irene","iris","isaac","isabella","isabelle","ivan","ivy","jack","jackie","jackson","jacob","jacqueline","jade","jake","james","jamie","jan","jane","janet","janice","jared","jasmine","jason","jay","jean","jeanette","jeanne","jeff","jeffrey","jen","jenna","jennifer","jenny","jeremy","jerry","jesse","jessica","jill","jillian","jim","jimmy","jo","joan","joann","joanna","joanne","jocelyn","jodi","jody","joe","joel","joey","john","johnny","jon","jonathan","jordan","jorge","jose","joseph","josh","joshua","joy","joyce","juan","juanita","judith","judy","julia","julian","juliana","julianne","julie","juliet","june","justin","kaitlin","kaitlyn","kara","karen","kari","karin","karl","karla","karyn","kate","katelyn","katherine","kathleen","kathryn","kathy","katie","katrina","kay","kayla","keith","kelley","kelli","kelly","kelsey","ken","kendra","kenneth","kenny","keri","kerry","kevin","kim","kimberly","kirsten","krista","kristen","kristin","kristina","kristine","kristy","kurt","kyle","lacey","lance","landon","lara","larry","laura","lauren","laurie","lawrence","lea","leah","lee","leigh","lena","leo","leon","leonard","leslie","liam","lillian","lily","linda","lindsay","lindsey","lisa","liz","logan","lois","loretta","lori","lorraine","louis","louise","lucas","lucia","lucie","lucy","luis","luke","lydia","lynn","mabel","mackenzie","maddie","madeline","madison","maggie","mallory","mandy","marc","marcella","marcia","marco","margaret","marge","maria","mariah","marianne","marie","marilyn","marina","mario","marisa","marissa","marjorie","mark","marlene","marsha","martha","martin","mary","mason","matt","matthew","maureen","max","megan","meghan","melanie","melinda","melissa","melody","mercedes","meredith","michael","michele","michelle","miguel","mike","mildred","milo","mindy","miranda","mitch","mitchell","molly","monica","morgan","muriel","myra","myrna","nancy","naomi","natalie","natasha","nathan","nathaniel","neal","neil","nelly","nicholas","nick","nicole","nina","noah","noel","nora","norma","olivia","oscar","owen","paige","pam","pamela","pat","patricia","patrick","patty","paul","paula","pauline","pedro","peggy","penny","perry","pete","peter","petra","phil","philip","phyllis","priscilla","rachel","rafael","ralph","ramona","randy","ray","raymond","rebecca","reed","regina","renee","rhonda","rich","richard","rick","ricky","riley","rita","rob","robert","roberta","robin","rochelle","rocky","rod","roger","roland","ron","ronald","rosa","rosalie","rose","rosemary","ross","roxanne","roy","ruby","russ","russell","ruth","ryan","sabrina","sadie","sally","sam","samantha","samuel","sandra","sandy","sara","sarah","scott","sean","serena","seth","shannon","shari","sharon","shawn","shayla","sheila","shelby","shelly","sheri","sherri","sheryl","shirley","sierra","simone","skylar","sofia","sonia","sonya","sophia","sophie","stacey","stacy","stanley","stella","stephanie","stephen","steve","steven","stuart","sue","susan","suzanne","sydney","sylvia","tamara","tammy","tanya","tara","taylor","ted","teresa","terri","terry","tess","tessa","theo","theodore","theresa","thomas","tiffany","tim","timothy","tina","todd","tom","tommy","toni","tony","tonya","tracey","tracy","travis","tricia","trish","tristan","troy","tyler","val","valerie","vanessa","vera","veronica","vicki","vicky","victor","victoria","vincent","viola","violet","virginia","vivian","wade","walt","walter","wanda","warren","wayne","wendy","wes","wesley","whitney","will","william","willie","wilma","wyatt","xavier","yolanda","yvette","yvonne","zach","zachary","zoe"
]);

function extractFirstName(email: string): string | null {
  const localPart = email.split("@")[0].toLowerCase();
  const segments = localPart.split(/[._\-+]/);
  
  const first = segments[0].replace(/\d+$/, "");
  if (first && COMMON_FIRST_NAMES.has(first)) {
    return first.charAt(0).toUpperCase() + first.slice(1);
  }
  
  if (segments.length >= 2) {
    for (let i = 1; i < Math.min(segments.length, 3); i++) {
      const seg = segments[i].replace(/\d+$/, "");
      if (seg && COMMON_FIRST_NAMES.has(seg)) {
        return seg.charAt(0).toUpperCase() + seg.slice(1);
      }
    }
  }
  
  return null;
}

async function main() {
  console.log("Extracting first names from email addresses (strict mode)...");
  
  const rows = await db.execute(sql`
    SELECT id, email1 
    FROM toast_guests 
    WHERE (first_name IS NULL OR first_name = '') 
      AND email1 IS NOT NULL AND email1 != ''
      AND merged_into_id IS NULL
      AND is_staff = false
  `);
  
  console.log(`Found ${rows.rows.length} customers without first names who have emails`);
  
  const updates: Array<{ id: number; firstName: string }> = [];
  let skipped = 0;
  const sampleExtractions: Array<{ email: string; name: string }> = [];
  const sampleSkips: string[] = [];
  
  for (const row of rows.rows) {
    const email = row.email1 as string;
    const id = row.id as number;
    const extracted = extractFirstName(email);
    
    if (extracted) {
      updates.push({ id, firstName: extracted });
      if (sampleExtractions.length < 30) {
        sampleExtractions.push({ email, name: extracted });
      }
    } else {
      skipped++;
      if (sampleSkips.length < 15) {
        sampleSkips.push(email);
      }
    }
  }
  
  console.log(`\nWill update ${updates.length} customers, skipping ${skipped}`);
  console.log(`\nSample extractions:`);
  for (const s of sampleExtractions) {
    console.log(`  ${s.email} → ${s.name}`);
  }
  console.log(`\nSample skips (no match to known name):`);
  for (const s of sampleSkips) {
    console.log(`  ${s}`);
  }
  
  const BATCH_SIZE = 500;
  let updated = 0;
  console.log(`\nApplying updates in batches of ${BATCH_SIZE}...`);
  
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    const cases = batch.map(u => `WHEN ${u.id} THEN '${u.firstName.replace(/'/g, "''")}'`).join(" ");
    const ids = batch.map(u => u.id).join(",");
    
    await db.execute(sql.raw(`
      UPDATE toast_guests 
      SET first_name = CASE id ${cases} END 
      WHERE id IN (${ids})
    `));
    
    updated += batch.length;
    if ((i / BATCH_SIZE) % 10 === 0) {
      console.log(`  Updated ${updated} / ${updates.length}...`);
    }
  }
  
  console.log(`\nDone! Updated ${updated} customers with extracted first names.`);
  
  const remaining = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM toast_guests 
    WHERE (first_name IS NULL OR first_name = '') 
      AND merged_into_id IS NULL AND is_staff = false
  `);
  console.log(`Remaining customers without first names: ${remaining.rows[0].cnt}`);
}

main().catch(console.error);
