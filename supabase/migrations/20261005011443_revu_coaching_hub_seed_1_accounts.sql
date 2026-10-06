/*
# REV University Coaching Hub — seed part 1 (accounts, onboarding, roadmap)

Seeds coaches, students, onboarding checklists, the demo onboarding form, and the
demo roadmap. Fixed UUIDs with ON CONFLICT DO NOTHING keep this idempotent.
*/

INSERT INTO coaches (id, name, email, phone, password_hash, calendly_url, headline) VALUES
('00000000-0000-0000-0000-0000000000a1','Ismail Hacking','coach.demo@example.com','+1 314 555 0131',crypt('JonahdaBeast2',gen_salt('bf')),'https://calendly.com/ismail-revu','Growth & lead gen'),
('00000000-0000-0000-0000-0000000000a2','Jonah Richards','jonah@revuniversity.com','+1 314 555 0142',crypt('JonahdaBeast2',gen_salt('bf')),'https://calendly.com/jonah-revu','Sales & accountability')
ON CONFLICT (id) DO NOTHING;

INSERT INTO students (id, coach_id, name, email, phone, password_hash, stage, start_date, location, current_revenue, goal_revenue, thirty_day_win) VALUES
('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','Alex Morgan','client.demo@example.com','+1 619 555 0171',crypt('JonahdaBeast2',gen_salt('bf')),'Active','2026-06-15','San Diego, CA',7000,25000,'Sign 3 new listing agreements'),
('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a1','Sarah Chen','sarah.chen@example.com','+1 415 555 0182',crypt('JonahdaBeast2',gen_salt('bf')),'Active','2026-05-04','San Francisco, CA',9000,20000,'Close 2 buyer sides'),
('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000a2','Marcus Lee','marcus.lee@example.com','+1 702 555 0193',crypt('JonahdaBeast2',gen_salt('bf')),'Active','2026-04-20','Las Vegas, NV',5000,15000,'Land first expired listing'),
('00000000-0000-0000-0000-0000000000b4','00000000-0000-0000-0000-0000000000a1','Priya Patel','priya.patel@example.com','+1 408 555 0114',crypt('JonahdaBeast2',gen_salt('bf')),'Onboarding','2026-09-28','San Jose, CA',4000,20000,'Complete onboarding sprint'),
('00000000-0000-0000-0000-0000000000b5','00000000-0000-0000-0000-0000000000a2','Tom Becker','tom.becker@example.com','+1 602 555 0155',crypt('JonahdaBeast2',gen_salt('bf')),'Active','2026-03-09','Phoenix, AZ',11000,30000,'Hire a transaction coordinator'),
('00000000-0000-0000-0000-0000000000b6','00000000-0000-0000-0000-0000000000a1','Emily Davis','emily.davis@example.com','+1 916 555 0166',crypt('JonahdaBeast2',gen_salt('bf')),'Active','2026-06-30','Sacramento, CA',13000,35000,'Scale listing pipeline to 20'),
('00000000-0000-0000-0000-0000000000b7','00000000-0000-0000-0000-0000000000a1','Jordan Scott','jordan.scott@example.com','+1 503 555 0177',crypt('JonahdaBeast2',gen_salt('bf')),'Graduated','2025-11-03','Portland, OR',24000,25000,'Hit 25k month'),
('00000000-0000-0000-0000-0000000000b8','00000000-0000-0000-0000-0000000000a2','Nina Rossi','nina.rossi@example.com','+1 305 555 0188',crypt('JonahdaBeast2',gen_salt('bf')),'Paused','2026-02-16','Miami, FL',6000,18000,'Restart outreach'),
('00000000-0000-0000-0000-0000000000b9','00000000-0000-0000-0000-0000000000a2','David Kim','david.kim@example.com','+1 206 555 0199',crypt('JonahdaBeast2',gen_salt('bf')),'Onboarding','2026-10-01','Seattle, WA',3000,10000,'Book onboarding call'),
('00000000-0000-0000-0000-0000000000ba','00000000-0000-0000-0000-0000000000a1','Olivia Green','olivia.green@example.com','+1 212 555 0110',crypt('JonahdaBeast2',gen_salt('bf')),'Offboarding','2026-01-12','New York, NY',18000,25000,'Wind down gracefully')
ON CONFLICT (id) DO NOTHING;

INSERT INTO onboarding_tasks (student_id, task_key, label, done, done_at) VALUES
('00000000-0000-0000-0000-0000000000b1','agreement_signed','Agreement signed',true,'2026-06-16'),
('00000000-0000-0000-0000-0000000000b1','joined_skool','Joined Skool',true,'2026-06-17'),
('00000000-0000-0000-0000-0000000000b1','form_completed','Onboarding form completed',true,'2026-06-18'),
('00000000-0000-0000-0000-0000000000b1','call_booked','Onboarding call booked',true,'2026-06-18'),
('00000000-0000-0000-0000-0000000000b1','call_held','Onboarding call held',true,'2026-06-20'),
('00000000-0000-0000-0000-0000000000b4','agreement_signed','Agreement signed',true,'2026-09-29'),
('00000000-0000-0000-0000-0000000000b4','joined_skool','Joined Skool',true,'2026-09-30'),
('00000000-0000-0000-0000-0000000000b4','form_completed','Onboarding form completed',true,'2026-10-02'),
('00000000-0000-0000-0000-0000000000b4','call_booked','Onboarding call booked',true,'2026-10-03'),
('00000000-0000-0000-0000-0000000000b4','call_held','Onboarding call held',false,NULL),
('00000000-0000-0000-0000-0000000000b9','agreement_signed','Agreement signed',false,NULL),
('00000000-0000-0000-0000-0000000000b9','joined_skool','Joined Skool',false,NULL),
('00000000-0000-0000-0000-0000000000b9','form_completed','Onboarding form completed',false,NULL),
('00000000-0000-0000-0000-0000000000b9','call_booked','Onboarding call booked',false,NULL),
('00000000-0000-0000-0000-0000000000b9','call_held','Onboarding call held',false,NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO onboarding_forms (student_id,current_revenue,goal_revenue,avg_order_value,team_size,biggest_struggle,number_one_goal,services_offered,lead_source,first_break,quality_rating,website,booking_portal,instagram,tools,thirty_day_win,not_working,shipping_address,submitted_at) VALUES
('00000000-0000-0000-0000-0000000000b1','$7,000 / month','$25,000 / month','~$12,500 avg commission','Solo right now','Consistent lead flow — I get spikes then droughts','Sign 3 new listing agreements in 30 days','Buyer & seller representation','Referrals + social media','Lead generation and follow-up','7','alexmorgan.realestate','Alex Morgan bookings','@alexsellsrealestate','Follow Up Boss, Canva','Sign 3 listings','Cold DMs — low reply rate','1234 Harbor Dr, San Diego, CA 92101','2026-06-18')
ON CONFLICT (id) DO NOTHING;

INSERT INTO roadmaps (student_id,title,approved,approved_by,approved_at) VALUES
('00000000-0000-0000-0000-0000000000b1','6-Month Plan: $7k to $25k',true,'00000000-0000-0000-0000-0000000000a1','2026-06-21')
ON CONFLICT (id) DO NOTHING;

INSERT INTO roadmap_milestones (roadmap_id, position, title, goal, homework, status) VALUES
((SELECT id FROM roadmaps WHERE student_id='00000000-0000-0000-0000-0000000000b1'),1,'Foundation & CRM setup','Get your database, CRM and daily habits locked in','Import 100 contacts into your CRM and set up your daily 10-touch routine','done'),
((SELECT id FROM roadmaps WHERE student_id='00000000-0000-0000-0000-0000000000b1'),2,'Lead engines: cold outreach','Build a repeatable outbound engine that fills 10+ new conversations a week','Send 100 cold emails and make 100 calls to your target broker list','current'),
((SELECT id FROM roadmaps WHERE student_id='00000000-0000-0000-0000-0000000000b1'),3,'Offer & sales call mastery','Convert conversations into signed agreements on a script','Run 10 live practice calls and record objections you got','upcoming'),
((SELECT id FROM roadmaps WHERE student_id='00000000-0000-0000-0000-0000000000b1'),4,'Follow-up systems','Turn dead leads into future closings automatically','Build a 30-day nurture sequence and add every "not now" lead','upcoming'),
((SELECT id FROM roadmaps WHERE student_id='00000000-0000-0000-0000-0000000000b1'),5,'Hiring your first editor','Free yourself from content so you can stay in front of clients','Post 3 content pieces a week and test your first editor hire','upcoming'),
((SELECT id FROM roadmaps WHERE student_id='00000000-0000-0000-0000-0000000000b1'),6,'Scale & delegation','Systemize so the business runs without you','Document your listing process and train your editor on it','upcoming')
ON CONFLICT (id) DO NOTHING;
