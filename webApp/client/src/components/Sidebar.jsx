import '../sidebar.css';

const Sidebar = ({ collapse, setCollapse, onAdminUsers, isAdmin }) => {
    const listItems = [
        { img: "home", label: "Dashboard", action: () => { } },
        { img: "barchart", label: "Analytics", action: () => { } },
        { img: "calendar", label: "Calendar", action: () => { } },
        { img: "tasks", label: "Tasks", action: () => { } },
        { img: "settings", label: "Settings", action: () => { } }
    ];

    // Add admin-only items
    if (isAdmin) {
        listItems.unshift({
            img: "userPlus",
            label: "Manage Users",
            action: onAdminUsers
        });
    }

    return (
        <div className={`sidebar${collapse ? ' collapsed' : ''}`}>
            <div className="sidebar-header">
                {!collapse && <h2>Menu</h2>}
                <img
                    src="/assets/Sidebar/bars.svg"
                    alt="Toggle"
                    className="sidebar-toggle"
                    onClick={() => setCollapse(!collapse)}
                />
            </div>
            <ul>
                {listItems.map((listItem, idx) => (
                    <li key={idx} onClick={listItem.action}>
                        <img src={`/assets/Sidebar/${listItem.img}.svg`} alt={listItem.label} />
                        {!collapse && <span>{listItem.label}</span>}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Sidebar;