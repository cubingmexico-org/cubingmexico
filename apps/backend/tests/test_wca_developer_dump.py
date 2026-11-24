"""Unit tests for WCA developer dump dual-field parsing."""

import io
import zipfile

from routes.admin.wca_developer_dump import (
    apply_dump_annotations,
    parse_result_dual_fields,
    split_mysql_values,
)


def _dump_zip(sql: str) -> io.BytesIO:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("wca-developer-database-dump.sql", sql)
    buf.seek(0)
    return buf


SAMPLE_SQL = """
--
-- Table structure for table `results`
--
CREATE TABLE `results` (
  `id` bigint NOT NULL,
  `global_pos` smallint NOT NULL,
  PRIMARY KEY (`id`)
);
INSERT INTO `results` VALUES
(8727404,-1,-1,'LosFuertesV3Puebla2026','Mexico','555bf','3',4,'2016TORO03','Leonardo Sánchez Del Toro',3,NULL,NULL,946060,'1','2026-11-20 00:08:40'),
(8727657,-1,166600,'LosFuertesV3Puebla2026','Mexico','555bf','3',4,'2016TORO03','Leonardo Sánchez Del Toro',2,NULL,NULL,946097,'f','2026-11-20 00:08:40'),
(100,1000,900,'OtherComp2025','Mexico','333','a',5,'2010TEST01','Test Person',5,NULL,NULL,100,'f','2026-01-01 00:00:00');
UNLOCK TABLES;

--
-- Table structure for table `rounds`
--
CREATE TABLE `rounds` (
  `id` bigint NOT NULL,
  `linked_round_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
);
INSERT INTO `rounds` VALUES
(946060,'{\\"type\\":\\"percent\\",\\"level\\":100}',169576,'2026-06-27 03:41:19',NULL,'3',0,7520,1,NULL,NULL,169576,'CompetitionEvent',NULL,1,'{\\"centiseconds\\":270000,\\"cumulativeRoundIds\\":[]}',2,'2026-11-17 02:19:54'),
(946097,NULL,169576,'2026-06-28 09:44:43',NULL,'3',0,7520,2,NULL,NULL,169576,'CompetitionEvent',NULL,1,'{\\"centiseconds\\":270000,\\"cumulativeRoundIds\\":[]}',2,'2026-11-17 02:19:54'),
(100,NULL,1,'2025-01-01 00:00:00',NULL,'a',0,NULL,1,NULL,NULL,1,'CompetitionEvent',NULL,1,NULL,1,'2025-01-01 00:00:00');
UNLOCK TABLES;
"""


def test_split_mysql_values_handles_nulls_and_escaped_json():
    fields = split_mysql_values(
        "(27,'{\\\"type\\\":\\\"ranking\\\",\\\"level\\\":60}',39074,'2017-09-17 19:48:04',NULL,'a',0,NULL,1),"
    )
    assert fields is not None
    assert fields[0] == "27"
    assert fields[1] == '{"type":"ranking","level":60}'
    assert fields[4] is None
    assert fields[7] is None


def test_parse_result_dual_fields_marks_linked_rounds():
    annotations = parse_result_dual_fields(
        _dump_zip(SAMPLE_SQL),
        result_ids=["8727404", "8727657", "100"],
    )
    assert annotations["8727657"] == (4, True)
    assert annotations["8727404"] == (4, True)
    assert annotations["100"] == (5, False)


def test_apply_dump_annotations_falls_back_to_local_pos():
    rows = [{"id": "8727657", "pos": 2}, {"id": "missing", "pos": 9}]
    annotated = apply_dump_annotations(rows, {"8727657": (4, True)})
    assert annotated["8727657"] == (4, True)
    assert annotated["missing"] == (9, False)
