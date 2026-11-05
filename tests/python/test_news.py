import copy
import json
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import Mock
from scripts.news.entities import identify, protect_terms, restore_terms
from scripts.news.feeds import parse_feed, fetch_feed
from scripts.news.model import UTC, article_id, canonical_url, digest, iso, parse_date
from scripts.news.pipeline import check_sources, deduplicate, normalize_item, run_update
from scripts.news.translation import translate_field
from scripts.news.validate import validate_news, validate_pair

NOW = datetime(2026, 11, 5, 8, tzinfo=UTC)


def source(id="owned-nba", category="nba"):
    return {
        "id": id,
        "name": "SportNow owned test fixture",
        "category": category,
        "feedUrl": "https://example.org/feed",
        "homepageUrl": "https://example.org/",
        "articleHosts": ["example.org"],
        "defaultTags": [],
        "enabled": True,
        "policy": {
            "mode": "headlines-only",
            "allowHeadlines": True,
            "allowSummary": False,
            "allowTitleTranslation": False,
            "allowSummaryTranslation": False,
            "licenseUrl": "https://example.org/license",
            "reviewedAt": "2026-11-05",
            "permissionReference": "SportNow-owned fictional test fixture",
            "reason": "Owned test content",
        },
    }


def item(
    name="San Antonio Spurs training test", url="https://example.org/a", published=None
):
    return {
        "title": name,
        "summary": "<p>Owned test summary.</p>",
        "url": url,
        "published": published or iso(NOW - timedelta(hours=1)),
    }


def fetcher(items):
    return lambda source, previous: {
        "items": copy.deepcopy(items),
        "httpStatus": 200,
        "etag": None,
        "lastModified": None,
    }


class RSSParsing(unittest.TestCase):
    def test_rss_and_html_sanitization(self):
        xml = b'<rss version="2.0"><channel><item><title>Spurs &amp; Lakers</title><link>https://example.org/a</link><description>&lt;p&gt;Hello&lt;/p&gt;&lt;script&gt;evil()&lt;/script&gt;</description><pubDate>Thu, 05 Nov 2026 07:00:00 GMT</pubDate></item></channel></rss>'
        found = parse_feed(xml)
        self.assertEqual(found[0]["title"], "Spurs & Lakers")
        self.assertEqual(found[0]["summary"], "Hello")

    def test_atom_namespace_and_alternate_link(self):
        xml = b'<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Owned headline</title><link rel="self" href="https://example.org/api"/><link rel="alternate" href="https://example.org/story"/><updated>2026-11-05T07:00:00Z</updated><summary>Owned summary.</summary></entry></feed>'
        found = parse_feed(xml)[0]
        self.assertEqual(found["url"], "https://example.org/story")
        self.assertEqual(found["published"], "2026-11-05T07:00:00Z")

    def test_html_bot_page_and_xml_entities_are_rejected(self):
        for body in [
            b"<html><body>Verify robot</body></html>",
            b'<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss><channel>&x;</channel></rss>',
        ]:
            with self.assertRaises(Exception):
                parse_feed(body)

    def test_fetch_requests_have_timeout_user_agent_and_bounded_retries(self):
        response = Mock()
        response.history = []
        response.url = "https://example.org/feed"
        response.status_code = 200
        response.headers = {}
        response.iter_content.return_value = [b"<rss><channel/></rss>"]
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=None)
        session = Mock()
        session.get.return_value = response
        self.assertEqual(fetch_feed(source(), session=session)["items"], [])
        kwargs = session.get.call_args.kwargs
        self.assertEqual(kwargs["timeout"], (8, 20))
        self.assertIn("SportNow", kwargs["headers"]["User-Agent"])


class Normalization(unittest.TestCase):
    def test_canonical_url_and_stable_identity(self):
        a = canonical_url(
            "https://www.example.org/a/?utm_source=rss&id=123#comments", ["example.org"]
        )
        b = canonical_url("http://example.org/a?id=123", ["example.org"])
        self.assertEqual(a, b)
        self.assertEqual(article_id(a), article_id(b))
        self.assertNotEqual(article_id(a), article_id(a + "4"))

    def test_bad_urls_and_dates(self):
        for value in [
            "javascript:alert(1)",
            "https://user:pass@example.org/a",
            "https://example.org.evil.test/a",
            "https://example.org:444/a",
        ]:
            with self.assertRaises(ValueError):
                canonical_url(value, ["example.org"])
        for value in ["not a time", "2026-11-05T07:00:00", "2027-01-01T00:00:00Z"]:
            with self.assertRaises((ValueError, TypeError)):
                parse_date(value, NOW)

    def test_entity_boundaries_accents_and_categories(self):
        self.assertIn(
            "spurs", identify("San Antonio Spurs and Victor Wembanyama", "", "nba")[0]
        )
        self.assertIn(
            "wembanyama",
            identify("San Antonio Spurs and Victor Wembanyama", "", "nba")[1],
        )
        teams, players, tags = identify(
            "Real Madrid and Kylian Mbappé in the Champions League", "", "football"
        )
        self.assertIn("madrid", teams)
        self.assertIn("mbappe", players)
        self.assertIn("欧冠", tags)
        self.assertEqual(
            identify("Tottenham Spurs and spurious warriorslike words", "", "football")[
                0
            ],
            [],
        )
        self.assertEqual(identify("Tim Duncanville", "", "nba")[1], [])

    def test_dedup_by_url_and_similar_titles_preserves_different_scores(self):
        s = source()
        a = normalize_item(
            item(
                "San Antonio Spurs score 100 points in an owned test",
                "https://example.org/a",
            ),
            s,
            NOW,
        )
        duplicate = copy.deepcopy(a)
        duplicate["originalUrl"] = "https://www.example.org/a?utm_source=feed"
        duplicate["tags"] = ["test"]
        similar = normalize_item(
            item(a["titleOriginal"] + "!", "https://example.org/b"), s, NOW
        )
        different = normalize_item(
            item(a["titleOriginal"].replace("100", "101"), "https://example.org/c"),
            s,
            NOW,
        )
        result = deduplicate([a, duplicate, similar, different])
        self.assertEqual(len(result), 2)


class Translation(unittest.TestCase):
    def test_term_protection_and_corrupted_placeholder_rejection(self):
        masked, terms = protect_terms("Real Madrid and Cristiano Ronaldo")
        self.assertEqual(
            restore_terms(masked, terms), "皇家马德里 and 克里斯蒂亚诺·罗纳尔多"
        )
        with self.assertRaises(ValueError):
            restore_terms("corrupted", terms)

    def test_cache_prevents_repeated_inference(self):
        translator = Mock(available=True)
        translator.translate.return_value = "这是测试。"
        cache = {}
        text, status = translate_field("This is a test.", "title", cache, translator)
        self.assertEqual(status, "translated")
        self.assertEqual(text, "这是测试。")
        self.assertEqual(
            translate_field("This is a test.", "title", cache, translator)[1], "cached"
        )
        translator.translate.assert_called_once()

    def test_failure_unavailable_and_numbers_preserve_english_fallback(self):
        translator = Mock(available=True)
        translator.translate.side_effect = TimeoutError("test timeout")
        self.assertEqual(
            translate_field("Owned test.", "title", {}, translator), ("", "failed")
        )
        self.assertEqual(
            translate_field("Owned test.", "title", {}, None), ("", "unavailable")
        )
        translator.translate.side_effect = None
        translator.translate.return_value = "得到 99 分。"
        self.assertEqual(
            translate_field("Scored 100 points.", "title", {}, translator),
            ("", "failed"),
        )


class Pipeline(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.dir = Path(self.temp.name)
        self.data = self.dir / "data"
        self.cache = self.dir / "cache.json"

    def tearDown(self):
        self.temp.cleanup()

    def run_pipeline(self, sources, fetch, now=NOW, translator=None):
        return run_update(self.data, self.cache, now, sources, fetch, translator)

    def read(self):
        return json.loads((self.data / "news.json").read_text()), json.loads(
            (self.data / "sources-status.json").read_text()
        )

    def test_json_schema_no_summary_without_permission_and_noop_stability(self):
        s = source()
        self.run_pipeline([s], fetcher([item()]))
        a, status = self.read()
        validate_pair(a, status)
        self.assertEqual(a["articles"][0]["summaryOriginal"], "")
        self.assertEqual(a["articles"][0]["translationStatus"], "skipped_policy")
        before = [
            p.read_bytes()
            for p in [self.data / "news.json", self.data / "sources-status.json"]
        ]
        result = self.run_pipeline([s], fetcher([item()]), NOW + timedelta(hours=1))
        self.assertFalse(result["newsChanged"])
        self.assertFalse(result["statusChanged"])
        self.assertEqual(
            before,
            [
                p.read_bytes()
                for p in [self.data / "news.json", self.data / "sources-status.json"]
            ],
        )

    def test_blocked_policy_does_not_leak_headlines_or_translate(self):
        s = source()
        s["policy"].update(mode="blocked", allowHeadlines=False, permissionReference="")
        translator = Mock(available=True)
        result = self.run_pipeline(
            [s], fetcher([item("DO NOT PUBLISH THIS HEADLINE")]), translator=translator
        )
        news, status = self.read()
        self.assertEqual(news["articles"], [])
        self.assertEqual(status["sources"][0]["publicationStatus"], "blocked")
        self.assertEqual(result["fetchedItems"], 1)
        self.assertNotIn(
            "DO NOT PUBLISH", "".join(p.read_text() for p in self.data.iterdir())
        )
        translator.translate.assert_not_called()

    def test_one_failed_source_preserves_archive_and_other_source_health(self):
        s1, s2 = source(), source("owned-football", "football")

        def initial(s, p):
            return fetcher([item("Test " + s["id"], "https://example.org/" + s["id"])])(
                s, p
            )

        self.run_pipeline([s1, s2], initial)

        def partial(s, p):
            if s["id"] == s1["id"]:
                raise TimeoutError("Source timeout")
            return initial(s, p)

        self.run_pipeline([s1, s2], partial, NOW + timedelta(hours=1))
        news, status = self.read()
        self.assertEqual(len(news["articles"]), 2)
        self.assertEqual(status["lastRunStatus"], "partial")
        self.assertEqual([s["fetchStatus"] for s in status["sources"]], ["error", "ok"])
        before = (self.data / "news.json").read_bytes()

        def failed(s, p):
            raise TimeoutError("All down")

        self.run_pipeline([s1, s2], failed, NOW + timedelta(hours=2))
        self.assertEqual((self.data / "news.json").read_bytes(), before)

    def test_retention_cap_and_rights_revocation(self):
        s = source()
        rows = [
            item(
                "Unique owned test " + str(i),
                "https://example.org/" + str(i),
                iso(NOW - timedelta(minutes=i)),
            )
            for i in range(1005)
        ]
        rows.append(
            item(
                "Expired owned sample",
                "https://example.org/expired",
                iso(NOW - timedelta(days=31)),
            )
        )
        self.run_pipeline([s], fetcher(rows))
        self.assertEqual(len(self.read()[0]["articles"]), 1000)
        s["policy"].update(mode="blocked", allowHeadlines=False, permissionReference="")
        self.run_pipeline([s], fetcher([]))
        self.assertEqual(self.read()[0]["articles"], [])

    def test_corrupt_history_and_permission_reference_stop_publication(self):
        self.data.mkdir()
        (self.data / "news.json").write_text("{broken")
        with self.assertRaises(json.JSONDecodeError):
            self.run_pipeline([source()], fetcher([]))
        s = source()
        s["policy"]["permissionReference"] = ""
        with self.assertRaises(ValueError):
            check_sources([s])

    def test_translation_failure_keeps_original_and_partial_policy_is_enforced(self):
        s = source()
        s["policy"].update(mode="licensed-translation", allowTitleTranslation=True)
        translator = Mock(available=True)
        translator.translate.side_effect = RuntimeError("Unavailable")
        self.run_pipeline([s], fetcher([item()]), translator=translator)
        article = self.read()[0]["articles"][0]
        self.assertEqual(article["titleZh"], "")
        self.assertTrue(article["titleOriginal"])
        self.assertEqual(article["translationStatus"], "failed")

    def test_explicit_personal_rss_mode_is_not_publisher_permission(self):
        s = source()
        s["policy"].update(
            mode="personal-rss",
            permissionReference="",
            allowSummary=True,
            allowTitleTranslation=True,
            allowSummaryTranslation=True,
        )
        translator = Mock(available=True)
        translator.translate.return_value = "这是自有测试文本的翻译。"
        self.run_pipeline(
            [s], fetcher([item("Owned test headline")]), translator=translator
        )
        news, status = self.read()
        article = news["articles"][0]
        self.assertTrue(article["titleZh"])
        self.assertTrue(article["summaryZh"])
        self.assertEqual(article["contentPolicy"]["permissionReference"], "")
        self.assertEqual(status["sources"][0]["publicationStatus"], "user-enabled")
        validate_pair(news, status)
        s["policy"].update(
            mode="blocked",
            allowHeadlines=False,
            allowTitleTranslation=False,
            allowSummaryTranslation=False,
        )
        self.run_pipeline([s], fetcher([]))
        self.assertEqual(self.read()[0]["articles"], [])

    def test_production_schema_rejects_demo_and_status_revision_mismatch(self):
        self.run_pipeline([source()], fetcher([item()]))
        news, status = self.read()
        broken = copy.deepcopy(news)
        broken["articles"][0]["isDemo"] = True
        with self.assertRaises(Exception):
            validate_news(broken)
        status["newsRevision"] = "bad"
        with self.assertRaises(ValueError):
            validate_pair(news, status)


if __name__ == "__main__":
    unittest.main()
