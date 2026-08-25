INSERT INTO "scoring_profiles" (
	"name", "version", "vertical_name", "solution", "weights", "evidence_requirements"
) VALUES (
	'Evidence First padrão',
	'prospect-v2.0',
	NULL,
	NULL,
	'{"digitalExposure":1,"API Security":1,"WAAP":1,"Guardicore":1}'::jsonb,
	'{"minimumEvidence":3,"minimumIndependentSources":1,"minimumConfidence":70}'::jsonb
) ON CONFLICT ("name", "version") DO NOTHING;
