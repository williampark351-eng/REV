/*
# REV University Coaching Hub — seed part 2 (calls, homework, risk data)

Seeds the demo client's full call history, action items, homework, submissions, notes,
hiring tracker and activity feed, plus health/risk data for the other students.
Fixed UUIDs with ON CONFLICT DO NOTHING keep this idempotent.
*/

-- ============ calls (demo client) ============
INSERT INTO calls (id, student_id, coach_id, scheduled_at, duration_min, status, meeting_link, recording_url, summary, topics, raw_notes) VALUES
('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','2026-06-20T10:00:00Z',60,'completed','https://meet.google.com/revu-onboarding','https://skool.com/revu/recordings/onb-alex','Kicked off the program. Alex is solo at $7k/mo with no CRM. Big opportunity in lead consistency. Set up baseline metrics and homework.','{Program kickoff,CRM setup,Lead sources}','Great energy. Wants to hit listings volume. Needs a simple daily routine first, not more tactics.'),
('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','2026-08-28T15:00:00Z',45,'completed','https://meet.google.com/revu-alex-2','https://skool.com/revu/recordings/alex-aug','Reviewed CRM health. Alex imported 85 contacts and is doing 10 touches a day. Moving into outbound cold outreach next.','{CRM review,Daily routine,Outreach prep}','Doing well on routine. Next: make outbound feel less scary with a script + practice reps.'),
('00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','2026-09-28T15:00:00Z',45,'completed','https://meet.google.com/revu-alex-3','https://skool.com/revu/recordings/alex-sep','Covered the outbound engine. Alex has the broker list ready but has not started sending. Assigned the first big outreach sprint with a hard due date.','{Cold outreach,Broker list,Objection practice}','Alex is nervous about cold calls. Agreed to 10/day not 100/day to build the habit, plus record practice calls.'),
('00000000-0000-0000-0000-0000000000c4','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','2026-10-08T16:00:00Z',NULL,'booked','https://meet.google.com/revu-alex-4',NULL,NULL,ARRAY['Outreach review','Objection practice'],NULL)
ON CONFLICT (id) DO NOTHING;

-- ============ action_items (demo client) ============
INSERT INTO action_items (id, call_id, student_id, text, done, due_date) VALUES
('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-0000000000b1','Send 100 cold emails to your broker list',false,'2026-10-04'),
('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-0000000000b1','Make 10 cold calls a day this week',false,'2026-10-06'),
('00000000-0000-0000-0000-0000000000d3','00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-0000000000b1','Record 3 practice cold-call reps and share them',false,'2026-10-07'),
('00000000-0000-0000-0000-0000000000d4','00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000b1','Set up your Follow Up Boss pipeline stages',true,'2026-09-01'),
('00000000-0000-0000-0000-0000000000d5','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000b1','Import all 100 contacts into your CRM',true,'2026-06-30')
ON CONFLICT (id) DO NOTHING;

-- ============ homework (demo client) ============
INSERT INTO homework (id, student_id, coach_id, title, description, due_date, status, reviewed_at) VALUES
('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','Build your broker target list (40 entries)','Compile 40 local agents/brokers you want to recruit or network with. Include name, brokerage, and a reason they fit.','2026-10-09','assigned',NULL),
('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','Watch objection-handling training','Watch the module in Skool and submit a short summary of the 3 objections you face most.','2026-10-02','submitted',NULL),
('00000000-0000-0000-0000-0000000000e3','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','Draft your 90-day focus plan','Write out your single most important task for each of the next 12 weeks.','2026-09-25','reviewed','2026-09-30'),
('00000000-0000-0000-0000-0000000000e4','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','Complete 40 cold calls before our next session','Track each call in Follow Up Boss with the outcome.','2026-10-03','overdue',NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO homework_updates (homework_id, student_id, body, link, created_at) VALUES
('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000b1','My 3 biggest objections: "I already have a vendor", "too expensive", "send me info". Summary attached.','https://docs.google.com/notes-alex','2026-10-02T18:20:00Z'),
('00000000-0000-0000-0000-0000000000e3','00000000-0000-0000-0000-0000000000b1','12-week plan drafted. My #1 M.I.T. is listings volume — everything else is a distraction.','https://docs.google.com/plan-alex','2026-09-28T12:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============ notes (demo client) ============
INSERT INTO notes (student_id, coach_id, body, created_at) VALUES
('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','Alex responds better to daily small wins than big weekly sprints. Keep cadence tight and check in mid-week.','2026-09-29T14:00:00Z'),
('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','Wife is due in December — plan a lighter sprint around that. Mentioned considering hiring sooner than the roadmap says.','2026-09-28T16:30:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============ hiring_items (demo client) ============
INSERT INTO hiring_items (student_id, step_key, label, done, done_at) VALUES
('00000000-0000-0000-0000-0000000000b1','job_posted','Job posted',true,'2026-10-01'),
('00000000-0000-0000-0000-0000000000b1','interviewing','Interviewing',false,NULL),
('00000000-0000-0000-0000-0000000000b1','test_edit','Test edit',false,NULL),
('00000000-0000-0000-0000-0000000000b1','hired','Hired',false,NULL)
ON CONFLICT (id) DO NOTHING;

-- ============ activity_log (demo client) ============
INSERT INTO activity_log (student_id, coach_id, type, message, created_at) VALUES
('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','homework_submitted','Submitted "Watch objection-handling training"','2026-10-02T18:20:00Z'),
('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','job_posted','Posted an editor job in REVhire','2026-10-01T09:00:00Z'),
('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','homework_reviewed','Coach reviewed "Draft your 90-day focus plan"','2026-09-30T10:00:00Z'),
('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','call_completed','1:1 call completed (45 min)','2026-09-28T16:00:00Z'),
('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','homework_assigned','New homework: "Build your broker target list"','2026-09-28T16:15:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============ risk-flag data for other students ============
-- Sarah Chen: missed call + overdue homework (at-risk)
INSERT INTO calls (id, student_id, coach_id, scheduled_at, duration_min, status, summary) VALUES
('00000000-0000-0000-0000-0000000000c5','00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a1','2026-09-27T17:00:00Z',NULL,'missed','No-show — did not respond to reminder.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO homework (student_id, coach_id, title, due_date, status) VALUES
('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a1','Send your first 20 buyer outreach messages','2026-10-02','overdue')
ON CONFLICT (id) DO NOTHING;

-- Marcus Lee: no upcoming call booked (at-risk)
INSERT INTO calls (id, student_id, coach_id, scheduled_at, duration_min, status, summary) VALUES
('00000000-0000-0000-0000-0000000000c6','00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000a2','2026-08-14T16:00:00Z',30,'completed','Covered lead gen basics.'),
('00000000-0000-0000-0000-0000000000c7','00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000a2','2026-09-12T16:00:00Z',30,'completed','Reviewed follow-up systems.')
ON CONFLICT (id) DO NOTHING;

-- Priya Patel (onboarding): call booked this week
INSERT INTO calls (id, student_id, coach_id, scheduled_at, duration_min, status, meeting_link) VALUES
('00000000-0000-0000-0000-0000000000c8','00000000-0000-0000-0000-0000000000b4','00000000-0000-0000-0000-0000000000a1','2026-10-06T17:30:00Z',NULL,'booked','https://meet.google.com/revu-priya-onb')
ON CONFLICT (id) DO NOTHING;

-- Tom Becker: no activity for 10+ days (at-risk)
INSERT INTO activity_log (student_id, coach_id, type, message, created_at) VALUES
('00000000-0000-0000-0000-0000000000b5','00000000-0000-0000-0000-0000000000a2','call_completed','1:1 call completed','2026-09-20T15:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Emily Davis (healthy): upcoming call this week + reviewed homework
INSERT INTO calls (id, student_id, coach_id, scheduled_at, duration_min, status, meeting_link) VALUES
('00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-0000000000b6','00000000-0000-0000-0000-0000000000a1','2026-10-09T18:00:00Z',NULL,'booked','https://meet.google.com/revu-emily')
ON CONFLICT (id) DO NOTHING;

INSERT INTO homework (student_id, coach_id, title, due_date, status, reviewed_at) VALUES
('00000000-0000-0000-0000-0000000000b6','00000000-0000-0000-0000-0000000000a1','Map your 20-listing pipeline','2026-09-30','reviewed','2026-10-03')
ON CONFLICT (id) DO NOTHING;

-- David Kim (onboarding): call this week
INSERT INTO calls (id, student_id, coach_id, scheduled_at, duration_min, status, meeting_link) VALUES
('00000000-0000-0000-0000-0000000000ca','00000000-0000-0000-0000-0000000000b9','00000000-0000-0000-0000-0000000000a2','2026-10-07T16:00:00Z',NULL,'booked','https://meet.google.com/revu-david')
ON CONFLICT (id) DO NOTHING;

-- Nina Rossi (paused): a past call for history
INSERT INTO calls (id, student_id, coach_id, scheduled_at, duration_min, status, summary) VALUES
('00000000-0000-0000-0000-0000000000cb','00000000-0000-0000-0000-0000000000b8','00000000-0000-0000-0000-0000000000a2','2026-04-10T16:00:00Z',40,'completed','Covered offer positioning.')
ON CONFLICT (id) DO NOTHING;

-- Jordan Scott (graduated): past call for history
INSERT INTO calls (id, student_id, coach_id, scheduled_at, duration_min, status, summary) VALUES
('00000000-0000-0000-0000-0000000000cc','00000000-0000-0000-0000-0000000000b7','00000000-0000-0000-0000-0000000000a1','2026-05-05T15:00:00Z',45,'completed','Final graduation review.')
ON CONFLICT (id) DO NOTHING;
