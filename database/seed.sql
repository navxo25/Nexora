DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Use the first available user, or create a placeholder
  SELECT id INTO test_user_id FROM users LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found. Register at least one user first.';
  END IF;

  -- Dharavi complaints
  INSERT INTO complaints (user_id, title, category, severity, latitude, longitude,
    location, ward, status, description, created_at) VALUES
  (test_user_id, 'Large pothole on 90 Feet Road', 'pothole', 'high',
   19.0413, 72.8537,
   ST_SetSRID(ST_MakePoint(72.8537, 19.0413), 4326), 'Dharavi', 'submitted',
   'Pothole approximately 2 feet wide blocking lane 1.',
   NOW() - INTERVAL '3 days'),

  (test_user_id, 'Garbage not collected for 5 days', 'garbage', 'high',
   19.0421, 72.8543,
   ST_SetSRID(ST_MakePoint(72.8543, 19.0421), 4326), 'Dharavi', 'verified',
   'Overflowing bin near Dharavi main road.',
   NOW() - INTERVAL '5 days'),

  -- Bandra complaints
  (test_user_id, 'Broken streetlight on Hill Road', 'lighting', 'medium',
   19.0596, 72.8295,
   ST_SetSRID(ST_MakePoint(72.8295, 19.0596), 4326), 'Bandra', 'in-progress',
   'Light out since last week. Dangerous at night.',
   NOW() - INTERVAL '7 days'),

  (test_user_id, 'Water pipe leak near St Andrews', 'water', 'high',
   19.0602, 72.8301,
   ST_SetSRID(ST_MakePoint(72.8301, 19.0602), 4326), 'Bandra', 'resolved',
   'Pipe burst flooding the footpath.',
   NOW() - INTERVAL '10 days'),

  -- Andheri complaints
  (test_user_id, 'Waterlogging at Andheri station east', 'water', 'high',
   19.1136, 72.8697,
   ST_SetSRID(ST_MakePoint(72.8697, 19.1136), 4326), 'Andheri', 'submitted',
   'Knee-deep water during rain. Risk of accidents.',
   NOW() - INTERVAL '2 days'),

  (test_user_id, 'Damaged footpath near Infiniti Mall', 'pothole', 'medium',
   19.1165, 72.8674,
   ST_SetSRID(ST_MakePoint(72.8674, 19.1165), 4326), 'Andheri', 'submitted',
   'Broken tiles causing trips and falls.',
   NOW() - INTERVAL '1 day'),

  -- Kurla complaints
  (test_user_id, 'Garbage dump near LBS Marg', 'garbage', 'medium',
   19.0726, 72.8874,
   ST_SetSRID(ST_MakePoint(72.8874, 19.0726), 4326), 'Kurla', 'verified',
   'Illegal dumping site growing every week.',
   NOW() - INTERVAL '4 days'),

  -- Borivali complaints
  (test_user_id, 'No street lights near Borivali station', 'lighting', 'medium',
   19.2290, 72.8570,
   ST_SetSRID(ST_MakePoint(72.8570, 19.2290), 4326), 'Borivali', 'resolved',
   'Entire stretch dark from 9pm onwards.',
   NOW() - INTERVAL '15 days');

END $$;

-- Update resolved_at for resolved complaints
UPDATE complaints
SET resolved_at = created_at + INTERVAL '36 hours'
WHERE status = 'resolved' AND resolved_at IS NULL;

-- Verify the seed worked
SELECT ward, status, COUNT(*) FROM complaints GROUP BY ward, status ORDER BY ward;
