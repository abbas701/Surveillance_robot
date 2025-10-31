import './styles/sidebar.css'

const Sidebar = ({ collapse, setCollapse }) => {
    const listItems = [
        { img: "userPlus", label: "Add Users" },
        { img: "barchart", label: "Users Chart" },
        { img: "calendar", label: "Calendar" },
        { img: "home", label: "Home" },
        { img: "tasks", label: "Tasks" },
        { img: "settings", label: "Settings" }
    ]
    return (
        <div className={`sidebar${collapse ? ' collapsed' : ''}`}>
            <div className="sidebar-header">
                {!collapse&&<h2>Menu</h2>}
                <img
                    src="src/assets/Sidebar/bars.svg"
                    alt="Toggle"
                    className="sidebar-toggle"
                    onClick={() => setCollapse(!collapse)}
                />
            </div>
            <ul>
                {listItems.map((listItem, idx) => (
                    <li key={idx}>
                        <img src={`src/assets/Sidebar/${listItem.img}.svg`} alt={listItem.label} />
                        {!collapse && <span>{listItem.label}</span>}
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default Sidebar