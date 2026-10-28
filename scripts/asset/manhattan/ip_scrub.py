"""맨해튼 180m blend 에서 **IP 위험 요소를 씬 단계에서 지운다** — export 보다 앞이다.

── 왜 여기인가 ──────────────────────────────────────────────────────────────
법무 개정판(🟡 조건부)의 막는 조건 **B-1** 이 처방 (가)「제거」와 (나)「`Vehicles`
컬렉션 통째 제외」 둘 중 하나를 요구한다. (나)는 fail-closed 기본값이고 차량이 전부
사라진다. (가)를 택하면 세계가 살지만 **「제거했다」는 진술로는 안 되고 대상 카운트
실측**이어야 한다 — 그 실측을 파이프라인 안의 한 단계로 만든 것이 이 파일이다.

자산 GLB 는 저장소에 커밋되지 않는다(예산 9배). 그래서 **절차가 저장소에 남는 유일한
것**이고, 검증도 절차 쪽에 붙어야 한다.

── 값은 여기에 없다 ────────────────────────────────────────────────────────
규칙·기대 카운트·위험 문자열 사전은 **`ip-scrub-rules.json` 한 곳**이다. 이 파일은
그것을 읽어 집행할 뿐이고, `tests/manhattan-ip-scrub.test.ts` 도 **같은 JSON** 을 읽는다
(bpy 휠 374MB 가 CI 에 없어 테스트가 파이썬을 못 부르기 때문이다). 어느 값이든 여기에
다시 적으면 그 순간 미러링이고, 테스트가 그것을 막는다.

── 규칙은 두 종류 + 한 사전 ────────────────────────────────────────────────
  ① `removeByType`  오브젝트 **타입** 전량 제거. 지금은 `FONT` 한 행이고 그것이 텍스트
                    축의 유일한 규칙이다(팀장 판정 2026-09-16 — 근거는 JSON 헤더).
  ② `removeObjects` 이름 **접두** 제거. 블렌더의 `.001` 중복 접미를 흡수한다.
  ③ `riskStrings`   위 둘과 **독립된** 위험 문자열 사전. 규칙이 다 돈 뒤 다시 훑는다.

**③ 이 설계의 핵이다.** 오브젝트째 삭제되는 대상도 사전에 남아 있어서, 제거가 실패하면
치환 규칙이 없어 조용히 통과하는 대신 `scanAfter` 가 잡는다. 검사가 규칙에서 파생되면
규칙이 틀린 순간 검사도 같이 틀린다 — 그래서 갈라 두었다.

**집행 순서는 ① → ②** 다. 그래서 ② 의 일부는 이미 사라진 것을 다시 찾게 되는데, 그
겹침을 **조용히 흡수하지 않는다**: 규칙마다 겹침 기대치를 적고 실제와 대조해 리포트에
찍는다(팀장 조건). ① 을 빼면 그 겹침이 잔여로 드러나 ② 의 카운트가 어긋난다.

🔴 **fail-closed.** 다음 중 하나라도면 예외를 던지고 죽는다. 조용히 넘기지 않는다:
  · 규칙이 찾은 대상 수가 기대 카운트와 다르다(원본이 갱신돼 하나 늘었다면 **멈출 신호**다)
  · 제거 대상이 품은 텍스트 본문·고유 문자열 종수가 기대와 다르다
  · 세탁 **전** 위험 히트가 `expectedHitsBefore` 와 다르다 — 0 이어야 할 축이 0 이 아닌 것도,
    잡혀야 할 축이 0 인 것도(후자는 사전이 **장식**이 됐다는 뜻이라 더 위험하다)
  · 규칙이 다 돈 뒤 `scan` 히트가 0 이 아니다
  · `removeByType` 이 지정한 타입의 오브젝트가 **한 개라도 남아 있다**(팀장 조건 L5)
  · 접두 매칭 자기검사(JSON 의 `prefixMatchCases`)가 깨진다
  · `pending` 항목에 대체안이 채워진 채 남아 있다(규칙으로 옮겨야 한다)

── 공백을 지우고 비교한다 ──────────────────────────────────────────────────
이 자산의 간판 문자는 자간을 **공백으로 벌려** 놓았고 줄바꿈도 섞여 있다. 눈에 보이는
문자열을 그대로 사전에 적으면 한 건도 안 걸린다 — 걸리지 않는 위험 문자열은 장식이다.
그래서 비교 전에 양쪽의 공백류를 전부 지운다(설정은 JSON 의 `scan.whitespace`).

── bpy 를 import 하지 않는다 ───────────────────────────────────────────────
`scan`/`scrub` 은 `bpy.data` 를 **인자로** 받는다(덕타이핑). 그래서 이 파일은 bpy 없이
import 되고, `--selftest` 는 순수 파이썬으로 돈다. 접두 매칭 구현이 파이썬과 타입스크립트
두 곳에 있는 것은 언어가 달라 불가피한데(`glb_names.py` 헤더가 같은 상황을 적어 둔
선례다), **같은 케이스표로 양쪽을 재기 때문에** 한쪽이 빗나가면 빨간불이 된다.

── 이 스캔이 못 보는 것 ────────────────────────────────────────────────────
이미지 **픽셀**에 그려진 글자, 지오메트리로 만든 글자꼴, 재질 **색** 자체. 문자열 축만
본다 — 못 잰 것을 통과로 적지 않기 위해 여기 적는다.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

RULES_PATH = Path(__file__).resolve().with_name("ip-scrub-rules.json")

_SUFFIX_RE = re.compile(r"^\.\d{3,}$")
_WS_RE = re.compile(r"\s+")

_SCOPES = ("text", "objectName", "materialName", "imageName")

# hits 샘플 상한 — 리포트가 폭주하지 않게. 총계(`byNeedle`/`total`)는 잘리지 않는다.
_HITS_CAP = 200


class ScrubError(RuntimeError):
    """규칙·실측이 어긋났다. 자산을 굽지 않고 멈춘다."""


def load_rules(path: Path | None = None) -> dict:
    return json.loads((path or RULES_PATH).read_text(encoding="utf-8"))


# ── 문자열 비교 ─────────────────────────────────────────────────────────────


def fold(value: str, rules: dict, case_sensitive: bool) -> str:
    """위험 문자열 비교용 정규화. 사전과 대상에 **똑같이** 적용한다."""
    out = _WS_RE.sub("", value) if rules.get("scan", {}).get("whitespace") == "strip" else value
    return out if case_sensitive else out.lower()


# ── 접두 매칭 ───────────────────────────────────────────────────────────────


def matches_prefix(name: str, prefix: str) -> bool:
    """블렌더의 중복 이름 접미(`.001`)를 흡수하는 접두 매칭.

    `startswith` 가 **아니다.** 그것은 접두를 품은 다른 오브젝트까지 지운다 — 삭제는
    되돌릴 수 없으므로 과잉 매칭이 과소 매칭보다 나쁘다. 접미는 `.` + 숫자 3자리
    이상만 허용한다(999 를 넘으면 자릿수가 늘어난다). 케이스표는 JSON 에 있다.
    """
    if name == prefix:
        return True
    if not name.startswith(prefix):
        return False
    return bool(_SUFFIX_RE.match(name[len(prefix) :]))


# ── 스캔 ────────────────────────────────────────────────────────────────────


def _font_body(ob) -> str | None:
    if getattr(ob, "type", None) != "FONT":
        return None
    d = getattr(ob, "data", None)
    return getattr(d, "body", None) if d is not None else None


def _scope_items(data) -> dict[str, list[tuple[str, str]]]:
    """스코프별 (어디, 무엇) 목록. `무엇` 이 위험 문자열과 대조되는 값이다."""
    texts: list[tuple[str, str]] = []
    names: list[tuple[str, str]] = []
    for ob in data.objects:
        names.append((ob.name, ob.name))
        body = _font_body(ob)
        if body is not None:
            texts.append((ob.name, body))
    return {
        "text": texts,
        "objectName": names,
        "materialName": [(m.name, m.name) for m in data.materials],
        "imageName": [(i.name, i.name) for i in data.images],
    }


def _type_counts(data) -> dict[str, int]:
    c = Counter(getattr(ob, "type", "?") for ob in data.objects)
    return dict(c)


def scan(data, rules: dict | None = None) -> dict:
    """`riskStrings` 로 씬을 훑어 히트를 센다. 제거 **전·후 둘 다** 호출한다.

    제거 후 호출이 이 설계의 핵이다 — 규칙이 빗나가도 여기서 잡힌다.
    """
    rules = rules or load_rules()
    items = _scope_items(data)

    by_needle: dict[str, dict[str, int]] = {}
    hits: list[dict] = []
    total = 0

    for risk in rules["riskStrings"]:
        needle = risk["needle"]
        cs = bool(risk.get("caseSensitive", True))
        allow = set(risk.get("allow", []))
        probe = fold(needle, rules, cs)
        per_scope = {s: 0 for s in risk["scopes"]}

        for scope in risk["scopes"]:
            for where, value in items.get(scope, []):
                # allow 는 **원문 그대로** 대조한다 — 정규화하면 「이 이름만 봐준다」가
                # 뜻하지 않게 넓어진다.
                if where in allow or value in allow:
                    continue
                if probe not in fold(value, rules, cs):
                    continue
                per_scope[scope] += 1
                total += 1
                if len(hits) < _HITS_CAP:
                    hits.append({"needle": needle, "scope": scope, "where": where, "value": value})

        by_needle[needle] = per_scope

    return {
        "total": total,
        "byNeedle": by_needle,
        "objectsByType": _type_counts(data),
        "hits": hits,
        "hitsTruncated": total > len(hits),
    }


# ── 자기검사 ────────────────────────────────────────────────────────────────


def selftest(rules: dict | None = None) -> dict:
    """bpy 없이 도는 검사. `scrub()` 진입 시 **항상** 먼저 돈다.

    자산을 굽는 그 순간 규칙 테이블이 검증된다 — CI 는 이 파일을 못 부르므로
    (bpy 휠 374MB) 검증 시점을 굽는 시점으로 당긴다.
    """
    rules = rules or load_rules()

    for case in rules["prefixMatchCases"]:
        got = matches_prefix(case["name"], case["prefix"])
        if got is not bool(case["expect"]):
            raise ScrubError(
                f"접두 매칭 자기검사 실패: name={case['name']!r} prefix={case['prefix']!r} "
                f"기대={case['expect']} 실제={got}"
            )

    pending = 0
    for item in rules["pending"]:
        if "id" not in item:
            continue
        pending += 1
        if item.get("to") is not None:
            raise ScrubError(
                f"pending {item['id']} 에 대체안이 채워져 있다 — 규칙으로 옮기고 "
                f"`riskStrings` 에 대응 항목을 추가해야 한다. 여기 두면 아무것도 집행되지 않는다."
            )

    return {"prefixCases": len(rules["prefixMatchCases"]), "pendingChecked": pending}


def _check_scan_before(scan_before: dict, rules: dict) -> None:
    """세탁 **전** 히트가 실측 선언과 같은지 본다.

    ⚠ 「0 이어야 할 축이 0 이 아니다」만 보는 것으로는 부족하다. **잡혀야 할 축이 0 인
    것**이 더 위험하다 — 사전이 장식이 됐다는 뜻이고, 그러면 제거가 실패해도 `scanAfter`
    가 0 을 돌려준다. 그래서 양방향으로 대조한다.
    """
    bad = []
    for risk in rules["riskStrings"]:
        want = risk.get("expectedHitsBefore")
        if want is None:
            continue
        got = scan_before["byNeedle"].get(risk["needle"], {})
        for scope, n in want.items():
            if got.get(scope, 0) != n:
                bad.append({"needle": risk["needle"], "scope": scope, "기대": n, "실제": got.get(scope, 0)})
    if bad:
        raise ScrubError(
            f"세탁 전 위험 히트가 실측 선언과 다르다 — 원본이 갱신됐거나 사전이 빗나갔다: {bad!r}"
        )


# ── 집행 ────────────────────────────────────────────────────────────────────


def _remove_by_type(data, rules: dict) -> tuple[list[str], dict]:
    """타입 전량 제거. 지금은 FONT 한 행이고 그것이 텍스트 축의 유일한 규칙이다."""
    removed: list[str] = []
    detail: dict[str, dict] = {}
    for rule in rules.get("removeByType", []):
        t = rule["type"]
        targets = [ob for ob in list(data.objects) if getattr(ob, "type", None) == t]
        if len(targets) != rule["expectObjects"]:
            raise ScrubError(
                f"타입 제거 대상 수 불일치: type={t} 기대={rule['expectObjects']} 실제={len(targets)}. "
                f"원본이 갱신됐다면 실측을 다시 뜨고 ip-scrub-rules.json 을 고쳐라."
            )

        bodies = Counter(b for b in (_font_body(ob) for ob in targets) if b is not None)
        want_unique = rule.get("expectUniqueBodies")
        if want_unique is not None and len(bodies) != want_unique:
            raise ScrubError(
                f"타입 제거 대상의 고유 문자열 종수 불일치: type={t} 기대={want_unique} 실제={len(bodies)}"
            )

        names = [ob.name for ob in targets]
        for ob in targets:
            data.objects.remove(ob, do_unlink=True)
        removed.extend(names)

        left = sum(1 for ob in data.objects if getattr(ob, "type", None) == t)
        if left:
            raise ScrubError(f"타입 제거 후에도 {t} 오브젝트가 {left}개 남았다 — 자산을 굽지 않는다.")

        detail[t] = {"removed": len(names), "uniqueBodies": len(bodies), "remaining": left}
    return removed, detail


def _remove_objects(data, rules: dict, already: set[str]) -> tuple[list[str], list[dict]]:
    """이름 접두 제거. `already` 는 앞 단계가 지운 이름 — 겹침을 **드러내려고** 받는다."""
    removed: list[str] = []
    overlaps: list[dict] = []
    for rule in rules["removeObjects"]:
        prefix = rule["prefix"]
        targets = [ob for ob in list(data.objects) if matches_prefix(ob.name, prefix)]
        overlap = sum(1 for n in already if matches_prefix(n, prefix))
        want_overlap = rule.get("expectRemovedEarlierByType", 0)
        want_here = rule["expectObjects"] - want_overlap

        if overlap != want_overlap:
            raise ScrubError(
                f"앞 단계와의 겹침 불일치: prefix={prefix!r} 기대={want_overlap} 실제={overlap}"
            )
        if len(targets) != want_here:
            raise ScrubError(
                f"제거 대상 수 불일치: prefix={prefix!r} 기대={want_here}"
                f"(총 {rule['expectObjects']} − 앞 단계 {want_overlap}) 실제={len(targets)} · "
                f"이름={[o.name for o in targets]!r}. 원본이 갱신됐다면 실측을 다시 뜨고 "
                f"ip-scrub-rules.json 을 고쳐라."
            )

        got = Counter(b for b in (_font_body(ob) for ob in targets) if b is not None)
        want = Counter({t["body"]: t["count"] for t in rule["expectTexts"] if want_overlap == 0})
        if got != want:
            raise ScrubError(
                f"제거 대상이 품은 텍스트 불일치: prefix={prefix!r} 기대={dict(want)!r} 실제={dict(got)!r}"
            )

        for ob in targets:
            removed.append(ob.name)
            data.objects.remove(ob, do_unlink=True)
        overlaps.append({"prefix": prefix, "removedHere": len(targets), "alreadyRemoved": overlap})
    return removed, overlaps


def _rewrite_texts(data, rules: dict) -> list[dict]:
    """텍스트 본문 치환. 지금은 규칙이 **없다**(팀장 판정 — JSON 의 `_rewriteTexts`)."""
    rewritten: list[dict] = []
    for rule in rules["rewriteTexts"]:
        src, dst = rule["from"], rule["to"]
        targets = [ob for ob in list(data.objects) if _font_body(ob) == src]
        if len(targets) != rule["expect"]:
            raise ScrubError(
                f"치환 대상 수 불일치: from={src!r} 기대={rule['expect']} 실제={len(targets)}."
            )
        for ob in targets:
            ob.data.body = dst
            rewritten.append({"obj": ob.name, "from": src, "to": dst})
    return rewritten


def scrub(data, rules: dict | None = None) -> dict:
    """규칙을 집행하고, **집행과 독립된 사전으로 다시 훑어** 0 을 확인한다."""
    rules = rules or load_rules()
    self_report = selftest(rules)

    scan_before = scan(data, rules)
    _check_scan_before(scan_before, rules)

    removed_by_type, type_detail = _remove_by_type(data, rules)
    removed_by_prefix, overlaps = _remove_objects(data, rules, set(removed_by_type))
    rewritten = _rewrite_texts(data, rules)

    scan_after = scan(data, rules)
    if scan_after["total"] != 0:
        raise ScrubError(
            f"세탁 후에도 위험 문자열이 {scan_after['total']}건 남았다 — 자산을 굽지 않는다. "
            f"히트: {scan_after['hits'][:10]!r}"
        )

    return {
        "rulesVersion": rules["version"],
        "selftest": self_report,
        "removedByType": type_detail,
        "removedObjects": removed_by_type + removed_by_prefix,
        "prefixRules": overlaps,
        "rewrittenTexts": rewritten,
        "counts": {
            "removedByType": len(removed_by_type),
            "removedByPrefix": len(removed_by_prefix),
            "removedObjects": len(removed_by_type) + len(removed_by_prefix),
            "overlapWithTypeRule": sum(o["alreadyRemoved"] for o in overlaps),
            "rewrittenTexts": len(rewritten),
            "riskHitsBefore": scan_before["total"],
            "riskHitsAfter": scan_after["total"],
            "fontObjectsAfter": scan_after["objectsByType"].get("FONT", 0),
        },
        "scanBefore": scan_before,
        "scanAfter": scan_after,
    }


# ── CLI ─────────────────────────────────────────────────────────────────────


def main() -> int:
    ap = argparse.ArgumentParser(description="맨해튼 자산 IP 세탁 규칙 — 자기검사·규칙 덤프")
    ap.add_argument("--selftest", action="store_true", help="bpy 없이 규칙 테이블을 검사한다")
    ap.add_argument("--dump-rules", action="store_true", help="규칙 JSON 을 그대로 낸다")
    args = ap.parse_args()

    rules = load_rules()
    if args.dump_rules:
        print(json.dumps(rules, ensure_ascii=False, indent=1))
        return 0

    report = selftest(rules)
    print(json.dumps({"ok": True, **report}, ensure_ascii=False), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
