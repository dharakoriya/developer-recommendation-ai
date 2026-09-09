from typing import List, Dict, Any, Set


def validate_task_dependencies(tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Validates a set of tasks for circular dependencies, self-dependencies, or missing references.
    
    Returns:
        dict: {
            "is_valid": bool,
            "errors": List[str],
            "circular_cycles": List[List[str]]
        }
    """
    errors: List[str] = []
    circular_cycles: List[List[str]] = []

    # Map task titles to title strings for reference validation
    title_to_task = {}
    for idx, t in enumerate(tasks):
        title = t.get("title")
        if title:
            title_to_task[title] = t

    # 1. Self-dependency and unknown reference checks
    adj_list: Dict[str, List[str]] = {title: [] for title in title_to_task.keys()}

    for title, task_obj in title_to_task.items():
        deps = task_obj.get("dependencies") or []
        for dep_title in deps:
            if dep_title == title:
                errors.append(f"Task '{title}' cannot depend on itself.")
                continue

            if dep_title not in title_to_task:
                errors.append(f"Task '{title}' references unknown dependency: '{dep_title}'.")
                continue

            adj_list[title].append(dep_title)

    # 2. Cycle detection using Tarjan's / DFS recursion stack algorithm
    visited: Set[str] = set()
    rec_stack: Set[str] = set()
    current_path: List[str] = []

    def dfs(node: str):
        visited.add(node)
        rec_stack.add(node)
        current_path.append(node)

        for neighbor in adj_list.get(node, []):
            if neighbor not in visited:
                dfs(neighbor)
            elif neighbor in rec_stack:
                cycle_start_idx = current_path.index(neighbor)
                cycle = current_path[cycle_start_idx:] + [neighbor]
                circular_cycles.append(cycle)
                cycle_str = " -> ".join(cycle)
                errors.append(f"Circular dependency detected: {cycle_str}")

        current_path.pop()
        rec_stack.remove(node)

    for node in title_to_task.keys():
        if node not in visited:
            dfs(node)

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "circular_cycles": circular_cycles,
    }
